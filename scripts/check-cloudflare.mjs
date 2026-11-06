// Read-only diagnostic. Values, tokens and database IDs are never printed.
import {readFileSync,appendFileSync} from 'node:fs';
const required=['CLOUDFLARE_API_TOKEN','CLOUDFLARE_ACCOUNT_ID','APP_TOKEN'];
const missing=required.filter(key=>!process.env[key]?.trim());
const report=lines=>{
 const message=lines.join('\n');console.log(message);
 if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,message+'\n');
};
if(missing.length){
 report(['Cloudflare connection: NOT CONFIGURED',...missing.map(key=>`- Missing GitHub Actions secret: ${key}`),'No resources were created, modified or deployed.']);
}else if(process.env.APP_TOKEN.length<24){
 report(['Cloudflare connection: INVALID APP_TOKEN (minimum 24 characters).','No resources were changed.']);
 process.exitCode=1;
}else{
 const config=JSON.parse(readFileSync(new URL('../wrangler.jsonc',import.meta.url),'utf8'));
 const expected=config.d1_databases[0].database_name;
 const account=process.env.CLOUDFLARE_ACCOUNT_ID;
 if(!/^[a-f0-9]{32}$/i.test(account))throw Error('Invalid CLOUDFLARE_ACCOUNT_ID format');
 const response=await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/d1/database?name=${encodeURIComponent(expected)}`,{
  headers:{authorization:`Bearer ${process.env.CLOUDFLARE_API_TOKEN}`},signal:AbortSignal.timeout(15000)
 });
 const data=await response.json();
 if(!response.ok||!data.success){report([`Cloudflare connection: FAILED (HTTP ${response.status}).`,'Verify token permissions for this account. No resources were changed.']);process.exitCode=1;}
 else report(['Cloudflare connection: AUTHENTICATED',`Configured D1 database found: ${data.result.some(x=>x.name===expected)?'YES':'NO'}`,'No resources were created, modified or deployed.']);
}
