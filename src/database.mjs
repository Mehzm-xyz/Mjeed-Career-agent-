import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync,mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';

// The application uses this small interface, not a hosting SDK.
export function openDatabase(path='data/masar.sqlite'){
 if(path!==':memory:')mkdirSync(dirname(resolve(path)),{recursive:true,mode:0o700});
 const db=new DatabaseSync(path);
 db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL;');
 db.exec('CREATE TABLE IF NOT EXISTS schema_migrations(name TEXT PRIMARY KEY)');
 for(const name of readdirSync(new URL('../migrations/',import.meta.url)).filter(x=>x.endsWith('.sql')).sort()){
  if(db.prepare('SELECT name FROM schema_migrations WHERE name=?').get(name))continue;
  db.exec('BEGIN IMMEDIATE');
  try{db.exec(readFileSync(new URL('../migrations/'+name,import.meta.url),'utf8'));db.prepare('INSERT INTO schema_migrations VALUES(?)').run(name);db.exec('COMMIT');}
  catch(e){db.exec('ROLLBACK');throw e;}
 }
 const wrap=(sql,args=[])=>({
  bind(...values){return wrap(sql,values)},
  async first(){return db.prepare(sql).get(...args)||null},
  async all(){return {results:db.prepare(sql).all(...args)}},
  async run(){const r=db.prepare(sql).run(...args);return {success:true,meta:{changes:Number(r.changes)}}},
  execute(){const r=db.prepare(sql).run(...args);return {success:true,meta:{changes:Number(r.changes)}}}
 });
 return {prepare:sql=>wrap(sql),async batch(statements){
  db.exec('BEGIN IMMEDIATE');try{const results=statements.map(s=>s.execute());db.exec('COMMIT');return results}catch(e){db.exec('ROLLBACK');throw e}
 },close:()=>db.close()};
}
