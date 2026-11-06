import {signedPayload} from './gmail-bridge.mjs';
export function appsScriptMail(env,fetcher=fetch){
 if(!env.GMAIL_SCRIPT_URL||!env.GMAIL_HMAC_KEY)return undefined;
 const endpoint=new URL(env.GMAIL_SCRIPT_URL);
 if(endpoint.protocol!=='https:'||endpoint.hostname!=='script.google.com'||!/^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(endpoint.pathname))throw Error('Invalid Gmail connector URL');
 const call=async(action,params={})=>{
  const envelope=await signedPayload({action,...params,issued_at:Date.now(),request_id:crypto.randomUUID()},env.GMAIL_HMAC_KEY);
  const res=await fetcher(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(envelope),signal:AbortSignal.timeout(25000)});
  if(!res.ok)throw Error('Gmail connector unavailable');
  const value=await res.json();if(!value.ok)throw Error('Gmail connector: '+String(value.error||'failed').slice(0,100));return value;
 };
 return {identity:async()=> (await call('identity')).email,readThread:id=>call('read_thread',{thread_id:id}),createDraft:payload=>call('create_draft',payload)};
}
