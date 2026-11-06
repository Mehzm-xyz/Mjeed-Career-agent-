// Import an operator-supplied JSON file directly into Cloudflare Worker Secrets.
// Real values stay outside the repository and are never printed.
import {readFile,realpath} from 'node:fs/promises';
import {resolve,relative,isAbsolute} from 'node:path';
import {spawn} from 'node:child_process';
const file=process.argv[2];
if(!file)throw Error('Pass a private JSON file outside this repository. See config/secrets.example.json for names only.');
const root=await realpath(resolve(import.meta.dirname,'..'));
const actual=await realpath(resolve(file));const rel=relative(root,actual);
if(!rel.startsWith('..')&&!isAbsolute(rel))throw Error('The real secrets file must be outside the repository.');
const allowed=JSON.parse(await readFile(resolve(root,'config/secrets.example.json'),'utf8'));
const data=JSON.parse(await readFile(actual,'utf8'));
const values={};
for(const [key,value] of Object.entries(data)){
 if(!(key in allowed))throw Error('Unexpected secret name: '+key);
 if(value!==''&&value!=null){if(typeof value!=='string')throw Error('Secret must be a string: '+key);values[key]=value;}
}
if(!Object.keys(values).length)throw Error('No populated secret slots supplied.');
const child=spawn(process.execPath,[resolve(root,'node_modules/wrangler/bin/wrangler.js'),'secret','bulk'],{cwd:root,env:process.env,stdio:['pipe','inherit','inherit']});
child.stdin.end(JSON.stringify(values));
process.exitCode=await new Promise((done,reject)=>{child.once('error',reject);child.once('exit',code=>done(code??1));});
