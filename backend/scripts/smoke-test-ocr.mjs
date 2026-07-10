import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawn, spawnSync } from 'child_process';

const baseUrl = process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:3000';
const adminEmail = process.env.SMOKE_ADMIN_EMAIL ?? 'admin@local.com';
const adminPassword = process.env.SMOKE_ADMIN_PASSWORD ?? 'Admin123';
const probeToken = 'OCRPRUEBA2026';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function requestJson(url, options = {}) {
  const { headers, ...rest } = options;
  let res;
  try {
    res = await fetch(url, {
      ...rest,
      headers: {
        ...(headers ?? {}),
      },
    });
  } catch (error) {
    throw new Error(
      `[ocr-smoke] request failed ${url}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { res, data };
}

async function waitForHealth(url, attempts = 120, delayMs = 500) {
  // Espera activa del endpoint de salud antes de ejecutar el flujo OCR.
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        return true;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return false;
}

function runBuildOrThrow() {
  const result = spawnSync('npm', ['run', 'build'], {
    encoding: 'utf8',
    shell: true,
  });
  if (result.status !== 0) {
    console.error('[ocr-smoke] build failed');
    console.error(result.stdout ?? '');
    console.error(result.stderr ?? '');
    throw new Error('[ocr-smoke] build failed');
  }
}

function runMigrationsOrThrow() {
  const result = spawnSync('npm', ['run', 'db:migration:run'], {
    encoding: 'utf8',
    shell: true,
  });
  if (result.status !== 0) {
    console.error('[ocr-smoke] migration failed');
    console.error(result.stdout ?? '');
    console.error(result.stderr ?? '');
    throw new Error('[ocr-smoke] migration failed');
  }
}

function killPort(port) {
  // Asegura puerto limpio para evitar que una corrida previa rompa el smoke.
  const netstat = spawnSync('netstat', ['-aon'], {
    encoding: 'utf8',
    shell: true,
  });
  if (netstat.status === 0 && typeof netstat.stdout === 'string') {
    const pids = new Set();
    for (const line of netstat.stdout.split(/\r?\n/)) {
      if (!line.includes(`:${port}`)) {
        continue;
      }
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && pid !== '0') {
        pids.add(pid);
      }
    }
    for (const pid of pids) {
      if (Number(pid) === process.pid) {
        continue;
      }
      spawnSync('taskkill', ['/PID', pid, '/T', '/F'], {
        stdio: 'ignore',
        shell: true,
      });
    }
    return;
  }

  const command = `$pids = Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique; if ($pids) { $pids | ForEach-Object { Stop-Process -Id $_ -Force } }`;
  spawnSync('powershell', ['-Command', command], {
    stdio: 'ignore',
    shell: true,
  });
}

async function ensureServer(url) {
  const healthUrl = `${url}/health`;
  // Orden requerido: liberar puerto -> compilar -> migrar -> arrancar -> validar health.
  killPort(3000);
  runBuildOrThrow();
  runMigrationsOrThrow();

  let stdoutBuffer = '';
  let stderrBuffer = '';
  const child = spawn('npm', ['run', 'start:prod'], {
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  child.stdout.on('data', (chunk) => {
    const text = chunk.toString();
    stdoutBuffer += text;
    process.stdout.write(text);
  });
  child.stderr.on('data', (chunk) => {
    const text = chunk.toString();
    stderrBuffer += text;
    process.stderr.write(text);
  });

  const ready = await waitForHealth(healthUrl);
  if (!ready) {
    const tail = (text) => text.split(/\r?\n/).slice(-200).join('\n');
    console.error('[ocr-smoke] server failed to start');
    console.error('--- stdout (tail) ---');
    console.error(tail(stdoutBuffer));
    console.error('--- stderr (tail) ---');
    console.error(tail(stderrBuffer));
    if (child.exitCode !== null) {
      console.error('[ocr-smoke] server exited with code', child.exitCode);
    }
    child.kill();
    throw new Error('[ocr-smoke] server failed to start');
  }

  return child;
}

function ensurePythonScannedPdf(targetPath) {
  // Genera un PDF rasterizado para forzar ruta OCR en lugar de texto incrustado.
  const script = `
from PIL import Image, ImageDraw, ImageFont

target = r"""${targetPath.replace(/\\/g, '\\\\')}"""
img = Image.new("RGB", (1800, 1200), "white")
draw = ImageDraw.Draw(img)
try:
    font = ImageFont.truetype(r"C:\\Windows\\Fonts\\arial.ttf", 92)
except Exception:
    font = ImageFont.load_default()
draw.text((120, 220), "DOCUMENTO ESCANEADO", fill="black", font=font)
draw.text((120, 420), "${probeToken}", fill="black", font=font)
draw.text((120, 620), "DMS SIG", fill="black", font=font)
img.save(target, "PDF", resolution=300.0)
print(target)
`;
  const result = spawnSync('python', ['-'], {
    input: script,
    encoding: 'utf8',
    shell: false,
  });
  if (result.status !== 0) {
    throw new Error(
      `[ocr-smoke] no se pudo generar PDF escaneado: ${result.stderr || result.stdout || 'sin detalle'}`,
    );
  }
}

async function ensureCatalogItem(params) {
  const { listPath, createPath, token, matcher, payload } = params;
  const list = await requestJson(`${baseUrl}${listPath}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  assert(list.res.ok, `[ocr-smoke] fallo listando catálogo ${listPath}`);
  const items = Array.isArray(list.data?.items) ? list.data.items : [];
  if (items.some(matcher)) {
    return;
  }
  const create = await requestJson(`${baseUrl}${createPath}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  assert(create.res.ok, `[ocr-smoke] fallo creando catálogo ${createPath}`);
}

async function waitForSearch(token, query, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const response = await requestJson(`${baseUrl}/search?q=${encodeURIComponent(query)}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    const total =
      typeof response.data?.total === 'number'
        ? response.data.total
        : response.data?.total?.value ?? 0;
    if (response.res.ok && total >= 1) {
      return response.data;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error('[ocr-smoke] no se encontró el documento OCR en búsqueda');
}

async function main() {
  let serverProcess;
  try {
    serverProcess = await ensureServer(baseUrl);

    const health = await requestJson(`${baseUrl}/health`, { method: 'GET' });
    assert(health.res.ok, '[ocr-smoke] backend no disponible');

    const bootstrap = await requestJson(`${baseUrl}/auth/bootstrap-admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, password: adminPassword }),
    });
    if (!bootstrap.res.ok && ![403, 409].includes(bootstrap.res.status)) {
      throw new Error(`[ocr-smoke] bootstrap falló ${bootstrap.res.status}`);
    }

    const login = await requestJson(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, password: adminPassword }),
    });
    assert(login.res.ok, `[ocr-smoke] login falló ${login.res.status}`);
    const token = login.data?.accessToken;
    assert(token, '[ocr-smoke] login sin token');

    await ensureCatalogItem({
      listPath: '/document-types?limit=100&q=PRO',
      createPath: '/document-types',
      token,
      matcher: (item) => item.code === 'PRO',
      payload: { code: 'PRO', nombreLargo: 'Procedimiento' },
    });
    await ensureCatalogItem({
      listPath: '/area-codes?limit=100&q=RC',
      createPath: '/area-codes',
      token,
      matcher: (item) => item.code === 'RC',
      payload: { code: 'RC', nombre: 'Recursos Humanos' },
    });

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dms-ocr-smoke-'));
    const pdfPath = path.join(tempDir, 'ocr-smoke.pdf');
    ensurePythonScannedPdf(pdfPath);

    try {
      const buffer = fs.readFileSync(pdfPath);
      const form = new FormData();
      form.append(
        'file',
        new Blob([buffer], { type: 'application/pdf' }),
        'ocr-smoke.pdf',
      );
      form.append('nombreDocumento', `OCR smoke ${Date.now()}`);
      form.append('documentTypeCode', 'PRO');
      form.append('areaCode', 'RC');
      form.append('comentario', 'Prueba de OCR para PDF escaneado');

      const upload = await fetch(`${baseUrl}/documents/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: form,
      });
      const uploadBody = await upload.text();
      let uploadData = null;
      try {
        uploadData = uploadBody ? JSON.parse(uploadBody) : null;
      } catch {
        uploadData = uploadBody;
      }

      assert(upload.ok, `[ocr-smoke] upload falló ${upload.status}: ${JSON.stringify(uploadData)}`);

      const documentId = uploadData?.documentId;
      assert(documentId, '[ocr-smoke] upload sin documentId');

      const versions = await requestJson(`${baseUrl}/documents/${documentId}/versions`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
      assert(versions.res.ok, `[ocr-smoke] versiones falló ${versions.res.status}`);
      const latestVersion = Array.isArray(versions.data) ? versions.data[0] : null;
      assert(latestVersion, '[ocr-smoke] sin versiones para validar OCR');
      assert(
        latestVersion.textSource === 'PDF_OCR',
        `[ocr-smoke] se esperaba textSource=PDF_OCR y llegó ${latestVersion.textSource}`,
      );
      assert(
        typeof latestVersion.contentText === 'string' &&
          latestVersion.contentText.toUpperCase().includes(probeToken),
        '[ocr-smoke] el texto OCR no contiene el token esperado',
      );

      const search = await waitForSearch(token, probeToken);
      assert(search.engine === 'elastic' || search.engine === 'fallback', '[ocr-smoke] búsqueda sin motor válido');

      console.log('[ocr-smoke] ok', {
        documentId,
        versionId: latestVersion.id,
        textSource: latestVersion.textSource,
        engine: search.engine,
      });
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  } finally {
    if (serverProcess) {
      serverProcess.kill();
      const exited = await new Promise((resolve) => {
        const timer = setTimeout(() => resolve(false), 5000);
        serverProcess.once('exit', () => {
          clearTimeout(timer);
          resolve(true);
        });
      });
      if (!exited && serverProcess.pid) {
        spawn('taskkill', ['/PID', String(serverProcess.pid), '/T', '/F'], {
          shell: true,
          stdio: 'ignore',
        });
      }
    }
    killPort(3000);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
