import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveD1Config } from '../scripts/resolve-d1-ci.mjs';

const id = 'e3a0cdd5-1fe2-4e04-90ff-d4eb6b756a16';
const original = { d1_databases: [{ binding: 'JOBS_DB', database_name: 'placeholder', database_id: 'placeholder' }] };

test('CI selects existing D1 by exact name without modifying checked-in config', () => {
  const cfg = resolveD1Config([{ name: 'kbnin', uuid: id }, { name: 'jknkn', uuid: '11111111-1111-4111-8111-111111111111' }], 'kbnin', original);
  assert.equal(cfg.d1_databases[0].database_name, 'kbnin');
  assert.equal(cfg.d1_databases[0].database_id, id);
  assert.equal(original.d1_databases[0].database_id, 'placeholder');
});

test('CI refuses nonexistent, ambiguous or invalid D1 selections', () => {
  assert.throws(() => resolveD1Config([], 'missing', original), /exactly one/);
  assert.throws(() => resolveD1Config([{ name: 'abc', uuid: id }, { name: 'abc', uuid: id }], 'abc', original), /exactly one/);
  assert.throws(() => resolveD1Config([{ name: 'abc', uuid: id }], '../abc', original), /exact existing D1/);
  assert.throws(() => resolveD1Config([{ name: 'abc', uuid: 'wrong' }], 'abc', original), /invalid ID/);
});
