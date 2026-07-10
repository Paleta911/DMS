import path from 'node:path';
import {
  buildManifest,
  copyStorageTree,
  ensureDir,
  listFilesRecursively,
  resolveStorageEnv,
  writeManifest,
} from './storage-lib.mjs';

async function main() {
  const { uploadDir, backupDir } = resolveStorageEnv();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupRoot = path.join(backupDir, `uploads-${stamp}`);
  const dataDir = path.join(backupRoot, 'data');
  const manifestPath = path.join(backupRoot, 'manifest.json');

  await ensureDir(dataDir);
  // Congela el listado antes de copiar para que manifest y respaldo describan el mismo estado.
  const files = await listFilesRecursively(uploadDir);
  const manifest = await buildManifest(uploadDir, files);
  await copyStorageTree({
    sourceDir: uploadDir,
    targetDir: dataDir,
    files,
  });
  await writeManifest(manifestPath, {
    // Guarda contexto de origen/destino para auditoria y restores posteriores.
    ...manifest,
    sourceUploadDir: uploadDir,
    backupRoot,
  });

  console.log(
    `[storage:backup] ok files=${manifest.fileCount} backupRoot=${backupRoot}`,
  );
}

main().catch((error) => {
  console.error(
    `[storage:backup] failed: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
});
