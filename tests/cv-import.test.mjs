import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cvKind,extractCvText,MAX_CV_BYTES,importCvToProfile} from '../src/cv-import.mjs';
test('CV parser rejects unsupported formats, spoofed signatures, oversized uploads',()=>{
 assert.throws(()=>cvKind('virus.exe',new Uint8Array([1])));
 assert.throws(()=>cvKind('cv.pdf',new Uint8Array([0,1,2,3])));
 assert.throws(()=>cvKind('cv.docx',new Uint8Array([0,1,2,3])));
 assert.throws(()=>cvKind('cv.txt',new Uint8Array(MAX_CV_BYTES+1)));
});
test('text CV accepts UTF-8 Arabic without inventing values',async()=>{
 const input='مهندس تطوير أعمال ومبيعات، خبرة في العقود الحكومية وإدارة العلاقات مع العملاء.';
 const x=await extractCvText('resume.txt',new TextEncoder().encode(input));
 assert.equal(x.kind,'txt');assert.equal(x.text,input);
});
test('a real DOCX archive is parsed by the installed mammoth Node entry point',async()=>{
 const fixture=readFileSync(new URL('./fixtures/resume.docx',import.meta.url));
 const r=await extractCvText('resume.docx',new Uint8Array(fixture).buffer);
 assert.equal(r.text,'Professional business development resume with verified sales experience.');
});
test('DOCX and PDF paths use documented extractors, no external API required',async()=>{
 const pdf=new Uint8Array([37,80,68,70,45]);
 const parsers={pdf:{async getDocumentProxy(){return {numPages:1,destroy:async()=>{}}},async extractText(){return {text:'Arabic professional profile and achievements'.repeat(2)}}}};
 const res=await extractCvText('resume.pdf',pdf,parsers);assert.match(res.text,/professional profile/);
 const docx=new Uint8Array([80,75,3,4]);
 const result=await extractCvText('resume.docx',docx.buffer,{docx:{async extractRawText(){return {value:'My professional experience and certifications'.repeat(2)}}}});
 assert.match(result.text,/professional experience/);
});
test('profile import atomically keeps the exact original and extracted text',async()=>{
 const {openDatabase}=await import('../src/database.mjs');
 const DB=openDatabase(':memory:');
 try{
  const str='Experienced project and commercial development professional with B2B responsibilities.';
  const bytes=new TextEncoder().encode(str);
  const file={name:'resume.txt',size:bytes.byteLength,type:'text/plain',async arrayBuffer(){return bytes.buffer}};
  const x=await importCvToProfile({DB},file);
  assert.equal(x.original_stored,true);
  const p=await DB.prepare('SELECT * FROM profile WHERE id=1').first();
  const stored=await DB.prepare('SELECT * FROM profile_files WHERE id=1').first();
  assert.equal(p.resume_text,str);assert.equal(Buffer.from(stored.content_base64,'base64').toString(),str);
  assert.equal(stored.sha256,p.resume_sha256);
 }finally{DB.close()}
});
