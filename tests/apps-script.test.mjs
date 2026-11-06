import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {createHmac} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {signedPayload} from '../src/gmail-bridge.mjs';
const key='test-only-bridge-key-with-over-32-characters';
function script(){
 const cache=new Map();let drafts=0;let draftsAllowed=false;
 const context=vm.createContext({
  PropertiesService:{getScriptProperties:()=>({getProperty:n=>n==='MASAR_SHARED_KEY'?key:n==='MASAR_DRAFTS_ENABLED'?String(draftsAllowed):null})},
  Utilities:{computeHmacSha256Signature:(body,secret)=>[...createHmac('sha256',secret).update(body).digest()],base64Decode:s=>[...Buffer.from(s,'base64')],newBlob:(...args)=>args},
  CacheService:{getScriptCache:()=>({get:k=>cache.get(k),put:(k,v)=>cache.set(k,v)})},
  LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock(){}})},
  ContentService:{MimeType:{JSON:'application/json'},createTextOutput:text=>({setMimeType:()=>JSON.parse(text)})},
  Session:{getEffectiveUser:()=>({getEmail:()=>'candidate@example.org'})},
  GmailApp:{getThreadById:id=>({getId:()=>id,getMessages:()=>[{getId:()=>'abcde1234',getFrom:()=>'hiring@example.org',getTo:()=>'candidate@example.org',getSubject:()=>'Interview',getPlainBody:()=>'Please confirm your availability.',getDate:()=>new Date(),getHeader:()=>''}]}),createDraft(){drafts++;return {getId:()=>'draft123'}}}
 });
 vm.runInContext(readFileSync(new URL('../connectors/google-apps-script/Code.gs',import.meta.url),'utf8'),context);
 return {context,drafts:()=>drafts,enableDrafts:()=>{draftsAllowed=true}};
}
const envelope=(action,params={})=>signedPayload({action,...params,issued_at:Date.now(),request_id:crypto.randomUUID()},key);
const call=(s,p)=>s.context.doPost({postData:{contents:JSON.stringify(p)}});
test('Gmail bridge reads replies while drafting is disabled, validates freshness and blocks replay',async()=>{
 const s=script();const p=await envelope('read_thread',{thread_id:'abcde12345678900'});
 const r=call(s,p);assert.equal(r.ok,true);assert.equal(r.messages[0].body,'Please confirm your availability.');assert.equal(s.drafts(),0);
 assert.equal(call(s,p).error,'replayed_request');
 const old=await signedPayload({action:'identity',issued_at:Date.now()-600000,request_id:crypto.randomUUID()},key);
 assert.equal(call(s,old).error,'unauthorized');
 assert.equal(call(s,{...await envelope('identity'),signature:'0'.repeat(64)}).error,'unauthorized');
});
test('only an actual PDF can become a Gmail draft; the bridge has no send action',async()=>{
 const s=script();
 assert.equal(call(s,await envelope('send')).error,'unsupported_action');
 assert.equal(call(s,await envelope('create_draft')).error,'drafts_disabled');s.enableDrafts();
 const p={recipient:'hiring@example.org',subject:'Account Manager',body:'Professional draft',attachment_name:'CV.pdf',attachment_base64:Buffer.from('%PDF-1.4 test').toString('base64')};
 assert.equal(call(s,await envelope('create_draft',{...p,attachment_base64:Buffer.from('Text file').toString('base64')})).error,'pdf_required');
 assert.equal(call(s,await envelope('create_draft',p)).sent,false);assert.equal(s.drafts(),1);
});
