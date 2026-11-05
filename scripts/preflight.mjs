import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const config = JSON.parse(readFileSync(join(root, 'wrangler.jsonc'), 'utf8'));
const err = [];
const warn = [];
if (config?.vars?.ENABLE_BROWSER_DEMO !== 'false') warn.push('Demo browser is enabled: turn it off after testing.');
if (config?.d1_databases?.some(db => !db.database_id || db.database_id.includes('REPLACE_'))) warn.push('D1 database ID is a placeholder: create D1 and set it before Cloudflare deployment.');
const forbiddenFiles = /(^|\/)(\.env(?:\..*)?|\.dev\.vars|\.npmrc|id_rsa|\.pem)$/;
const patterns = [
  /cfat_[A-Za-z0-9_-]{20,}/g,
  /(?:sk-proj-|sk-)[A-Za-z0-9_-]{20,}/g,
  /gh[pousr]_[A-Za-z0-9]{25,}/g,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
];
function walk(path) {
  for (const entry of readdirSync(path, {withFileTypes:true})) {
    const file=join(path,entry.name);
    const rel=relative(root,file).replaceAll('\\','/');
    if (entry.isDirectory()) {
      if (['node_modules','.git','.wrangler'].includes(entry.name)) continue;
      walk(file);
    } else {
      if (forbiddenFiles.test('/'+rel)) err.push(`Sensitive file present: ${rel}`);
      if (/\.(?:html|css|js|mjs|json|jsonc|md|gs|sql|txt|yml|yaml)$/.test(rel) && !rel.endsWith('/scripts/preflight.mjs')) {
        const body=readFileSync(file,'utf8');
        for (const p of patterns) if (p.test(body)) err.push(`Credential-like value in ${rel} (${p.source.slice(0,15)}...)`);
      }
    }
  }
}
walk(root);
console.log('Masar preflight');
for (const w of warn) console.log('WARN:',w);
for (const e of err) console.error('ERROR:',e);
console.log(err.length ? 'FAIL' : 'PASS: no credential-like values or sensitive config files found');
process.exitCode=err.length?1:0;
