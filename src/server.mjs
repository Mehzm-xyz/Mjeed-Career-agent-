import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,extname,sep} from 'node:path';
import {timingSafeEqual} from 'node:crypto';
import {Readable} from 'node:stream';
import app from './app.mjs';
import {openDatabase} from './database.mjs';
import {runDailyMailCheck} from './mail-service.mjs';
import {appsScriptMail} from './mail-connector.mjs';

export async function startServer({port=Number(process.env.PORT||3000),host=process.env.HOST||'127.0.0.1',DB,AI,MAIL,BROWSER,...settings}={}){
 const ownDB=!DB;DB||=openDatabase(process.env.DATABASE_PATH||'data/masar.sqlite');
 const token=settings.APP_TOKEN||process.env.APP_TOKEN||'';
 if(token.length<24){if(ownDB)DB.close();throw Error('Set APP_TOKEN to a private random value of at least 24 characters');}
 const root=fileURLToPath(new URL('../public/',import.meta.url));
 const env={...process.env,...settings,APP_TOKEN:token,DB,AI,MAIL,BROWSER,ASSETS:{async fetch(request){
  let path;try{path=decodeURIComponent(new URL(request.url).pathname)}catch{return new Response('Bad path',{status:400})}
  const file=resolve(root,'.'+(path==='/'?'/index.html':path));
  if(!file.startsWith(root.endsWith(sep)?root:root+sep))return new Response('Not found',{status:404});
  try{const bytes=await readFile(file);return new Response(bytes,{headers:{'content-type':({'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript'})[extname(file)]||'application/octet-stream','x-content-type-options':'nosniff','content-security-policy':"default-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'"}})}catch{return new Response('Not found',{status:404})}
 }}};
 env.MAIL||=appsScriptMail(env);
 const server=createServer(async(req,res)=>{
  try{
   const url=new URL(req.url,'http://localhost');
   if(url.pathname.startsWith('/api/')&&url.pathname!=='/api/health'){
    const supplied=Buffer.from(String(req.headers.authorization||'').slice(7)),expected=Buffer.from(token);
    if(!String(req.headers.authorization||'').startsWith('Bearer ')||supplied.length!==expected.length||!timingSafeEqual(supplied,expected)){
     res.writeHead(401,{'content-type':'application/json'});res.end(JSON.stringify({error:'غير مصرح'}));return;
    }
   }
   // Bound the streamed body, including chunked uploads, before buffering it.
   const chunks=[];let size=0;
   for await(const chunk of req){size+=chunk.length;if(size>2300000){res.writeHead(413);res.end();return}chunks.push(chunk)}
   const request=new Request('http://localhost'+req.url,{method:req.method,headers:req.headers,...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(chunks)}:{})});
   const response=await app.fetch(request,env);
   res.writeHead(response.status,Object.fromEntries(response.headers));
   if(req.method==='HEAD'){res.end();return}
   if(response.body)Readable.fromWeb(response.body).pipe(res);else res.end();
  }catch{if(!res.headersSent)res.writeHead(500,{'content-type':'application/json'});res.end('{"error":"Internal server error"}');}
 });
 await new Promise((ok,fail)=>{server.once('error',fail);server.listen(port,host,ok)});
 // A running process checks for a due daily read. No sending is performed here.
 let check=Promise.resolve();
 const tick=()=>{check=runDailyMailCheck(env).catch(()=>{});return check};
 const timer=setInterval(tick,60000);timer.unref();void tick();
 return {server,env,origin:`http://${host}:${server.address().port}`,async close(){clearInterval(timer);await new Promise(ok=>server.close(ok));await check;if(ownDB)DB.close()}};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const running=await startServer();console.log('Masar listening at '+running.origin+'; hosting and AI provider are not selected; sending is paused.');
 for(const signal of ['SIGINT','SIGTERM'])process.once(signal,async()=>{await running.close();process.exit(0)});
}
