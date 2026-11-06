import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';

const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const script=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
function openApp(url='https://masar.test/?demo=1',fetcher,token){
  const dom=new JSDOM(html,{url,runScripts:'outside-only'});
  dom.window.scrollTo=()=>{};
  if(fetcher)dom.window.fetch=fetcher;
  if(token)dom.window.sessionStorage.setItem('masar_token',token);
  dom.window.eval(script);
  return dom;
}
test('actual app boots and every navigation button opens its page',()=>{
  const dom=openApp();
  try{
    const d=dom.window.document;
    assert.equal(d.querySelector('#mode-label').textContent,'استعراض محلي (غير متصل)');
    for(const button of d.querySelectorAll('[data-page]')){
      button.click();
      assert.equal(d.querySelector('.page.active').id,`page-${button.dataset.page}`);
    }
    d.querySelector('#add-job-open').click();
    assert.equal(d.querySelector('#job-modal').classList.contains('hidden'),false);
  }finally{dom.window.close();}
});
test('unauthenticated cloud startup requests a token without sending API requests',async()=>{
  let calls=0;
  const dom=openApp('https://masar.test/',async()=>{calls++;throw Error('unexpected fetch')});
  try{
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(calls,0);
    assert.equal(dom.window.document.querySelector('#auth-modal').classList.contains('hidden'),false);
    assert.equal(dom.window.document.querySelector('#connection-indicator').textContent,'يحتاج ربطًا');
  }finally{dom.window.close();}
});
test('disconnect clears visible CV data and cannot be undone by an in-flight refresh',async()=>{
 let release;
 const pending=new Promise(resolve=>{release=resolve});
 const fetcher=async path=>({ok:true,async json(){await pending;return path.endsWith('/profile')?{profile:{full_name:'Private owner',resume_text:'Private resume',email:'private@example.org'}}:path.endsWith('/jobs')?{jobs:[]}:path.endsWith('/applications')?{applications:[]}:path.endsWith('/source-groups')?{groups:[]}:path.endsWith('/discovery/sources')?{sources:[]}:{};}});
 const dom=openApp('https://masar.test/',fetcher,'local-test-token-with-at-least-24-chars');
 try{
   const d=dom.window.document;
   d.querySelector('[name=full_name]').value='Previous owner';
   d.querySelector('[name=resume_text]').value='Previous private resume';
   d.querySelector('#clear-auth').click();
   release();await new Promise(resolve=>setImmediate(resolve));
   assert.equal(d.querySelector('[name=full_name]').value,'');
   assert.equal(d.querySelector('[name=resume_text]').value,'');
   assert.equal(dom.window.sessionStorage.getItem('masar_token'),null);
   assert.equal(d.querySelector('#connection-indicator').textContent,'يحتاج ربطًا');
 }finally{dom.window.close();}
});
