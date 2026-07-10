import { access } from 'node:fs/promises';
import path from 'node:path';
import { computeSha256, readManifest } from './storage-lib.mjs';

async function main() {
  const backupRootArg = process.argv[2];
  if (!backupRootArg) {
    throw new Error('Debes indicar la ruta del backup a verificar');
  }

  const backupRoot = path.resolve(process.cwd(), backupRootArg);
  const manifestPath = path.join(backupRoot, 'manifest.json');
  const dataDir = path.join(backupRoot, 'data');

  await access(manifestPath);
  await access(dataDir);

  const manifest = await readManifest(manifestPath);
  let verified = 0;
  for (const file of manifest.files ?? []) {
    // Verify presence + checksum for every file declared in backup manifest.
    const targetPath = path.join(dataDir, file.path);
    await access(targetPath);
    const checksum = await computeSha256(targetPath);
    if (checksum !== file.sha256) {
      throw new Error(`Checksum inválido en backup para ${file.path}`);
    }
    verified += 1;
  }

  console.log(`[storage:verify] ok files=${verified} backup=${backupRoot}`);
}

main().catch((error) => {
  console.error(
    `[storage:verify] failed: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
});
