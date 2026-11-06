import test from 'node:test';
import assert from 'node:assert/strict';
import {targetRoles,matchesTargetRole,requireTargetRole,ROLE_FAMILIES} from '../src/target-roles.mjs';
test('up to six explicit roles; blanks optional and normalized duplicates collapsed',()=>{
 assert.equal(targetRoles(['Sales Manager','','sales manager','Account Executive']).length,2);
 assert.throws(()=>targetRoles(['a','b','c','d','e','f','g']),/ستة/);
});
test('six owner-selected bilingual families cover levels without allowing technical growth roles',()=>{
 const roles=ROLE_FAMILIES.map(x=>x.label);
 for(const title of ['Senior Government Sales Specialist','Head of Public Sector Sales','أخصائي منافسات','Senior Tendering Specialist','مدير تطوير الأعمال','Business Development Manager','Key Account Manager','Account Director','Growth Specialist','مدير قطاع تجاري'])assert.ok(matchesTargetRole(title,roles),title);
 assert.equal(matchesTargetRole('Growth Engineer',roles),false);
 assert.equal(matchesTargetRole('Payroll Accountant',roles),false);
});
test('no preparation without selection, or outside chosen roles',()=>{
 assert.throws(()=>requireTargetRole('Sales Manager',''),/حدد/);
 assert.throws(()=>requireTargetRole('Accountant','Account Manager'),/خارج/);
 assert.equal(matchesTargetRole('Senior Account Executive - Saudi Arabia','Account Executive'),true);
 assert.equal(matchesTargetRole('Salesforce Developer','Sales'),false);
 assert.doesNotThrow(()=>requireTargetRole('مدير تطوير الأعمال','تطوير الأعمال'));
});
