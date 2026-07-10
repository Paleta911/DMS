import { access } from 'node:fs/promises';
import path from 'node:path';
import {
  computeSha256,
  copyStorageTree,
  ensureDir,
  readManifest,
  resolveStorageEnv,
} from './storage-lib.mjs';

async function main() {
  const backupRootArg = process.argv[2];
  if (!backupRootArg) {
    throw new Error('Debes indicar la ruta del backup a restaurar');
  }

  const { uploadDir } = resolveStorageEnv();
  const backupRoot = path.resolve(process.cwd(), backupRootArg);
  const manifestPath = path.join(backupRoot, 'manifest.json');
  const dataDir = path.join(backupRoot, 'data');

  await access(manifestPath);
  await access(dataDir);

  const manifest = await readManifest(manifestPath);
  const files = Array.isArray(manifest.files)
    ? manifest.files.map((item) => item.path)
    : [];

  await ensureDir(uploadDir);
  await copyStorageTree({
    sourceDir: dataDir,
    targetDir: uploadDir,
    files,
  });

  for (const file of manifest.files ?? []) {
    // Post-restore checksum validation ensures restored files match backup manifest.
    const targetPath = path.join(uploadDir, file.path);
    const checksum = await computeSha256(targetPath);
    if (checksum !== file.sha256) {
      throw new Error(`Checksum inválido al restaurar ${file.path}`);
    }
  }

  console.log(
    `[storage:restore] ok files=${manifest.fileCount ?? files.length} source=${backupRoot}`,
  );
}

main().catch((error) => {
  console.error(
    `[storage:restore] failed: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
});
