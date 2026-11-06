import test from 'node:test';
import assert from 'node:assert/strict';
import {targetRoles,matchesTargetRole,requireTargetRole} from '../src/target-roles.mjs';
test('up to six explicit roles; blanks optional and normalized duplicates collapsed',()=>{
 assert.equal(targetRoles(['Sales Manager','','sales manager','Account Executive']).length,2);
 assert.throws(()=>targetRoles(['a','b','c','d','e','f','g']),/ستة/);
});
test('no preparation without selection, or outside chosen roles',()=>{
 assert.throws(()=>requireTargetRole('Sales Manager',''),/حدد/);
 assert.throws(()=>requireTargetRole('Accountant','Account Manager'),/خارج/);
 assert.equal(matchesTargetRole('Senior Account Executive - Saudi Arabia','Account Executive'),true);
 assert.equal(matchesTargetRole('Salesforce Developer','Sales'),false);
 assert.doesNotThrow(()=>requireTargetRole('مدير تطوير الأعمال','تطوير الأعمال'));
});
