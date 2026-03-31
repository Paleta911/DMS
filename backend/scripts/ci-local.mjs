import path from 'path';
import { spawn, spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import {
  checkElasticReady,
  checkSqlReady,
  resolveInfraEnv,
  waitForDependency,
} from './lib/infra-utils.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const { esNode, dbHost, dbPort } = resolveInfraEnv();
const strictElastic =
  process.argv.includes('--strict') ||
  ['1', 'true', 'yes'].includes(
    String(process.env.CI_LOCAL_STRICT ?? '').toLowerCase(),
  );
const strictOcr =
  process.argv.includes('--strict-ocr') ||
  ['1', 'true', 'yes'].includes(
    String(process.env.CI_LOCAL_STRICT_OCR ?? '').toLowerCase(),
  );

function runNpmScript(scriptName) {
  return new Promise((resolve, reject) => {
    console.log(`[ci:local] running npm run ${scriptName}`);
    const child = spawn('npm', ['run', scriptName], {
      stdio: 'inherit',
      shell: true,
    });
    child.on('error', (error) => reject(error));
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`[ci:local] npm run ${scriptName} failed with code ${code}`));
    });
  });
}

function commandReady(command, args = ['--version']) {
  const result = spawnSync(command, args, {
    stdio: 'ignore',
    shell: false,
  });
  if (result.error?.code === 'ENOENT') {
    return false;
  }
  return result.status === 0;
}

async function ensureDatabaseReady() {
  let dbReady = await waitForDependency({
    label: `sqlserver ${dbHost}:${dbPort}`,
    timeoutMs: 15000,
    checker: () => checkSqlReady({ database: 'master' }),
  });
  if (dbReady.ready) {
    return;
  }

  console.log(
    `[ci:local] sql not ready at ${dbHost}:${dbPort}; starting infra:up:db`,
  );
  await runNpmScript('infra:up:db');
  dbReady = await waitForDependency({
    label: `sqlserver ${dbHost}:${dbPort}`,
    timeoutMs: 120000,
    checker: () => checkSqlReady({ database: 'master' }),
  });
  if (!dbReady.ready) {
    throw new Error(`sql not ready at ${dbHost}:${dbPort} (${dbReady.reason})`);
  }
}

async function ensureElasticReadyForStrictMode() {
  let elastic = await checkElasticReady(esNode, 2500);
  if (elastic.ready) {
    return elastic;
  }

  if (!strictElastic) {
    return elastic;
  }

  console.log(`[ci:local] elastic not ready at ${esNode}; starting infra:up:search`);
  await runNpmScript('infra:up:search');
  return waitForDependency({
    label: `elasticsearch ${esNode}`,
    timeoutMs: 120000,
    checker: () => checkElasticReady(esNode, 2500),
  });
}

async function main() {
  console.log(
    `[ci:local] start (strictElastic=${strictElastic ? 'true' : 'false'}, strictOcr=${strictOcr ? 'true' : 'false'})`,
  );

  await runNpmScript('build');
  await runNpmScript('test');
  await ensureDatabaseReady();
  await runNpmScript('db:ensure');
  await runNpmScript('db:migration:run');
  await runNpmScript('test:smoke');
  await runNpmScript('test:smoke:registration');

  const elastic = await ensureElasticReadyForStrictMode();
  if (elastic.ready) {
    console.log(`[ci:local] elastic up at ${esNode} (${elastic.reason})`);
    await runNpmScript('test:smoke:elastic');
  } else {
    if (strictElastic) {
      throw new Error(
        `elastic not ready at ${esNode} (${elastic.reason}) and strict mode is enabled`,
      );
    }
    console.log(
      `[ci:local] elastic not ready at ${esNode}; skipping test:smoke:elastic (${elastic.reason})`,
    );
  }

  const ocrEnabled =
    ['1', 'true', 'yes'].includes(
      String(process.env.OCR_ENABLED ?? 'true').toLowerCase(),
    ) && commandReady(process.env.OCR_TESSERACT_BIN || 'tesseract');
  const pdftoppmReady = commandReady(process.env.OCR_PDFTOPPM_BIN || 'pdftoppm', [
    '-v',
  ]);
  if (ocrEnabled && pdftoppmReady) {
    await runNpmScript('test:smoke:ocr');
  } else if (strictOcr) {
    throw new Error(
      `OCR smoke requires tesseract and pdftoppm (${ocrEnabled ? 'tesseract:ok' : 'tesseract:missing'}, ${pdftoppmReady ? 'pdftoppm:ok' : 'pdftoppm:missing'})`,
    );
  } else {
    console.log(
      `[ci:local] OCR deps not ready; skipping test:smoke:ocr (${ocrEnabled ? 'tesseract:ok' : 'tesseract:missing'}, ${pdftoppmReady ? 'pdftoppm:ok' : 'pdftoppm:missing'})`,
    );
  }

  console.log('[ci:local] done');
}

main().catch((error) => {
  console.error('[ci:local] error:', error.message);
  process.exit(1);
});
