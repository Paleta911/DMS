import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

function buildPdfBuffer(text: string) {
  const safeText = String(text).replace(/([()\\])/g, '\\$1');
  const parts: string[] = [];
  const offsets: number[] = [];
  let offset = 0;
  const push = (chunk: string) => {
    parts.push(chunk);
    offset += Buffer.byteLength(chunk, 'ascii');
  };

  push('%PDF-1.4\n');
  offsets[1] = offset;
  push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  offsets[2] = offset;
  push('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
  offsets[3] = offset;
  push(
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n',
  );
  const stream = `BT\n/F1 18 Tf\n20 120 Td\n(${safeText}) Tj\nET\n`;
  offsets[4] = offset;
  push(
    `4 0 obj\n<< /Length ${Buffer.byteLength(stream, 'ascii')} >>\nstream\n${stream}endstream\nendobj\n`,
  );
  offsets[5] = offset;
  push('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n');
  const xrefOffset = offset;
  push('xref\n0 6\n0000000000 65535 f \n');
  for (let index = 1; index <= 5; index += 1) {
    push(`${String(offsets[index]).padStart(10, '0')} 00000 n \n`);
  }
  push('trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n');
  push(`${xrefOffset}\n%%EOF\n`);
  return Buffer.from(parts.join(''), 'ascii');
}

export async function createPdfFixture(name: string, text: string) {
  const dir = await mkdtemp(path.join(tmpdir(), 'dms-e2e-'));
  const filePath = path.join(dir, name);
  await writeFile(filePath, buildPdfBuffer(text));
  return filePath;
}
