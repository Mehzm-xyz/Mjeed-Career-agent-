import test from 'node:test';
import assert from 'node:assert/strict';
import { SOURCE_GROUPS } from '../src/source-groups.mjs';

test('مجموعات المصادر لا تحتوي عناصر مكررة',()=>{
 const ids=SOURCE_GROUPS.flatMap(g=>g.items.map(x=>x.id));
 assert.equal(new Set(ids).size,ids.length);
 assert.ok(ids.includes('linkedin'));
 assert.ok(ids.includes('naukrigulf'));
 assert.ok(ids.includes('jadarat'));
 assert.ok(ids.includes('workday'));
});
test('لينكدإن ليست تكامل تقديم مُفعّل',()=>{
 const linkedIn=SOURCE_GROUPS.flatMap(g=>g.items).find(x=>x.id==='linkedin');
 assert.equal(linkedIn.status,'discovery_candidate');
 assert.match(linkedIn.apply,/غير مفعّل/);
});
