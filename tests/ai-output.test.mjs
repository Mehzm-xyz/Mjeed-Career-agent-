import test from 'node:test';
import assert from 'node:assert/strict';
import {readAIText} from '../src/ai-output.mjs';
test('Llama and Qwen response formats produce text without dumping provider metadata',()=>{
 assert.equal(readAIText({response:'A complete test response'}),'A complete test response');
 const result={choices:[{message:{content:'نص عربي تجريبي واضح'}}],usage:{tokens:100},id:'private-metadata'};
 assert.equal(readAIText(result),'نص عربي تجريبي واضح');
 assert.throws(()=>readAIText({usage:{tokens:100}}));
});
