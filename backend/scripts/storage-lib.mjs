import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readdir, readFile, stat, writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';

export async function ensureDir(dirPath) {
  await mkdir(dirPath, { recursive: true });
}

export function resolveStorageEnv() {
  const cwd = process.cwd();
  return {
    uploadDir: path.resolve(cwd, process.env.UPLOAD_DIR ?? './uploads'),
    backupDir: path.resolve(cwd, process.env.BACKUP_DIR ?? './backups'),
  };
}

export async function listFilesRecursively(rootDir) {
  const files = [];
  await walk(rootDir, rootDir, files);
  return files.sort((a, b) => a.localeCompare(b));
}

export async function computeSha256(filePath) {
  const hash = createHash('sha256');
  await new Promise((resolve, reject) => {
    const stream = createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', resolve);
  });
  return hash.digest('hex');
}

export async function readManifest(manifestPath) {
  const raw = await readFile(manifestPath, 'utf8');
  return JSON.parse(raw);
}

export async function writeManifest(manifestPath, manifest) {
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}

export async function copyStorageTree(params) {
  const {
    sourceDir,
    targetDir,
    files,
    onFile,
  } = params;

  for (const relativePath of files) {
    const sourcePath = path.join(sourceDir, relativePath);
    const targetPath = path.join(targetDir, relativePath);
    await ensureDir(path.dirname(targetPath));
    await copyFile(sourcePath, targetPath);
    if (typeof onFile === 'function') {
      await onFile(relativePath, sourcePath, targetPath);
    }
  }
}

async function walk(rootDir, currentDir, files) {
  let entries = [];
  try {
    entries = await readdir(currentDir, { withFileTypes: true });
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return;
    }
    throw error;
  }

  for (const entry of entries) {
    const absolutePath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      await walk(rootDir, absolutePath, files);
      continue;
    }
    if (!entry.isFile()) {
      continue;
    }
    const relativePath = path.relative(rootDir, absolutePath);
    files.push(relativePath);
  }
}

export async function buildManifest(uploadDir, files) {
  const items = [];
  for (const relativePath of files) {
    const absolutePath = path.join(uploadDir, relativePath);
    const fileStat = await stat(absolutePath);
    items.push({
      path: relativePath.replace(/\\/g, '/'),
      size: fileStat.size,
      mtime: fileStat.mtime.toISOString(),
      sha256: await computeSha256(absolutePath),
    });
  }
  return {
    createdAt: new Date().toISOString(),
    uploadDir,
    fileCount: items.length,
    files: items,
  };
}
