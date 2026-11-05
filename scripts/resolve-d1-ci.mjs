import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Called by the manually triggered GitHub Actions workflow.
// It only selects an EXISTING database; it never creates or deletes resources.
export function resolveD1Config(dbList, requestedName, baseConfig) {
  const name = String(requestedName || '').trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{1,99}$/.test(name)) {
    throw new Error('Provide the exact existing D1 database name (2-100 letters, numbers, _ or -).');
  }
  if (!Array.isArray(dbList)) throw new Error('Cloudflare D1 list did not return an array.');
  const found = dbList.filter(item => item?.name === name);
  if (found.length !== 1) throw new Error(`Expected exactly one existing D1 database named ${name}, found ${found.length}. No resource was changed.`);
  const id = found[0].uuid || found[0].id;
  if (!/^[a-f0-9]{8}-[a-f0-9-]{27,36}$/i.test(String(id || ''))) {
    throw new Error('D1 database entry has an invalid ID. No resource was changed.');
  }
  const cfg = structuredClone(baseConfig);
  const databases = cfg.d1_databases;
  if (!Array.isArray(databases) || databases.length !== 1 || databases[0]?.binding !== 'JOBS_DB') {
    throw new Error('Expected one JOBS_DB binding in wrangler.jsonc.');
  }
  databases[0].database_name = name;
  databases[0].database_id = id;
  return cfg;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  const [, , listPath, dbName, outputPath = '.wrangler.ci.jsonc'] = process.argv;
  if (!listPath || !dbName) throw new Error('Usage: node scripts/resolve-d1-ci.mjs <d1-list.json> <existing-database-name> [output]');
  const config = resolveD1Config(
    JSON.parse(readFileSync(listPath, 'utf8')),
    dbName,
    JSON.parse(readFileSync('wrangler.jsonc', 'utf8')),
  );
  writeFileSync(outputPath, JSON.stringify(config, null, 2) + '\n', { mode: 0o600 });
  console.log(`Verified existing Cloudflare D1 database: ${dbName}. Generated temporary Wrangler config (no secrets).`);
}
