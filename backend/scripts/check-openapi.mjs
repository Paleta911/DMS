import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { spawnSync } from 'child_process';

const args = new Set(process.argv.slice(2));
const writeMode = args.has('--write');
const rootDir = process.cwd();
const snapshotPath = resolve(rootDir, 'openapi', 'openapi.snapshot.json');
const generatedPath = resolve(rootDir, 'tmp', 'openapi.current.json');

function stableSort(value) {
  // Deterministic key ordering avoids false diffs caused by object property order.
  if (Array.isArray(value)) {
    return value.map((item) => stableSort(item));
  }
  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = stableSort(value[key]);
        return acc;
      }, {});
  }
  return value;
}

function normalizeDocument(path) {
  const content = JSON.parse(readFileSync(path, 'utf8'));
  return `${JSON.stringify(stableSort(content), null, 2)}\n`;
}

const exportResult = spawnSync(
  'npm',
  ['run', 'docs:openapi:export', '--', generatedPath],
  {
    cwd: rootDir,
    shell: true,
    stdio: 'inherit',
    env: process.env,
  },
);

if (exportResult.status !== 0) {
  process.exit(exportResult.status ?? 1);
}

const generated = normalizeDocument(generatedPath);

if (writeMode || !existsSync(snapshotPath)) {
  // Update mode rewrites the tracked snapshot from current generated contract.
  mkdirSync(dirname(snapshotPath), { recursive: true });
  writeFileSync(snapshotPath, generated, 'utf8');
  console.log(`[openapi] snapshot actualizado: ${snapshotPath}`);
  process.exit(0);
}

const snapshot = normalizeDocument(snapshotPath);
if (snapshot !== generated) {
  // Fail CI when API contract changes without snapshot update.
  console.error(
    '[openapi] el contrato exportado no coincide con el snapshot versionado',
  );
  console.error(`[openapi] snapshot: ${snapshotPath}`);
  console.error(`[openapi] generado: ${generatedPath}`);
  console.error(
    '[openapi] ejecuta `npm run docs:openapi:update` si el cambio es intencional',
  );
  process.exit(1);
}

console.log('[openapi] snapshot verificado');
