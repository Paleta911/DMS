import { spawn, spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';

function loadEnvFromFile() {
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    return;
  }
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvFromFile();

const esNode = process.env.ES_NODE ?? 'http://127.0.0.1:9200';
const baseUrl = process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:3000';
const adminEmail = process.env.SMOKE_ADMIN_EMAIL ?? 'admin@local.com';
const adminPassword = process.env.SMOKE_ADMIN_PASSWORD ?? 'Admin123';

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
      headers: { 'Content-Type': 'application/json', ...(headers ?? {}) },
    });
  } catch (error) {
    throw new Error(`[request] failed ${url}: ${error.message}`);
  }
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { res, data };
}

function unwrapListPayload(data) {
  if (Array.isArray(data)) {
    return data;
  }
  if (Array.isArray(data?.items)) {
    return data.items;
  }
  return [];
}

function getSearchTotal(data) {
  if (typeof data?.total === 'number') {
    return data.total;
  }
  return data?.total?.value ?? 0;
}

function normalizeDocumentSearchFields(document) {
  const q =
    document?.nombre ??
    document?.name ??
    document?.codigo ??
    null;
  const documentTypeCode =
    document?.documentTypeCode ??
    document?.documentType?.code ??
    null;
  const areaCode =
    (typeof document?.areaCode === 'string'
      ? document.areaCode
      : document?.areaCode?.code) ?? null;

  return { q, documentTypeCode, areaCode };
}

async function fetchWithTimeout(url, timeoutMs, options) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...(options ?? {}), signal: controller.signal });
    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    return { ok: res.ok, status: res.status, body: text, data };
  } catch (error) {
    return { ok: false, status: null, body: null, error: error.message };
  } finally {
    clearTimeout(timer);
  }
}

async function waitForElasticsearchReady(params = { totalMs: 120000, intervalMs: 2000, timeoutMs: 2000 }) {
  const attempts = Math.ceil(params.totalMs / params.intervalMs);
  let lastError = 'no response';
  const started = Date.now();
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    if (attempt === 1 || attempt % 5 === 0) {
      console.log(`[smoke:elastic] waiting for ES... attempt ${attempt}/${attempts}`);
    }
    const root = await fetchWithTimeout(esNode, params.timeoutMs, { method: 'GET' });
    if (root.ok) {
      const health = await fetchWithTimeout(`${esNode}/_cluster/health`, params.timeoutMs, { method: 'GET' });
      const status = health.data?.status;
      if (health.ok && (status === 'yellow' || status === 'green')) {
        return { ok: true, elapsedMs: Date.now() - started };
      }
      lastError = health.body || health.error || `cluster health not ready (status ${health.status ?? 'no response'})`;
    } else {
      lastError = root.body || root.error || `no response (status ${root.status ?? 'n/a'})`;
    }
    await new Promise((resolve) => setTimeout(resolve, params.intervalMs));
  }
  return { ok: false, elapsedMs: Date.now() - started, error: lastError };
}

async function waitForHealth(params = { totalMs: 120000 }) {
  const started = Date.now();
  let attempt = 0;
  let lastError = 'no response';
  while (Date.now() - started < params.totalMs) {
    attempt += 1;
    const delay = attempt <= 10 ? 1000 : 2000;
    const res = await fetchWithTimeout(`${baseUrl}/health`, 2000, { method: 'GET' });
    if (res.ok && res.data?.db === 'up' && res.data?.es === 'up') {
      return { ok: true, elapsedMs: Date.now() - started, data: res.data };
    }
    lastError = res.body || res.error || `status ${res.status ?? 'no response'}`;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  return { ok: false, elapsedMs: Date.now() - started, error: lastError };
}

function killPort(port) {
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

function tailChars(text, maxChars) {
  if (!text) return '';
  return text.length > maxChars ? text.slice(-maxChars) : text;
}

function runMigrationsOrThrow() {
  const result = spawnSync('npm', ['run', 'db:migration:run'], {
    encoding: 'utf8',
    shell: true,
  });
  if (result.status !== 0) {
    console.error('[smoke:elastic] migration failed');
    console.error(result.stdout ?? '');
    console.error(result.stderr ?? '');
    throw new Error('[smoke:elastic] migration failed');
  }
}

function runBuildOrThrow() {
  const result = spawnSync('npm', ['run', 'build'], {
    encoding: 'utf8',
    shell: true,
  });
  if (result.status !== 0) {
    console.error('[smoke:elastic] build failed');
    console.error(result.stdout ?? '');
    console.error(result.stderr ?? '');
    throw new Error('[smoke:elastic] build failed');
  }
}

async function describeHealth(url) {
  const res = await fetchWithTimeout(url, 2000, { method: 'GET' });
  return { ok: res.ok, status: res.status, body: res.body ?? res.error };
}

async function main() {
  console.log('[smoke:elastic] ES_NODE:', esNode);
  const esReady = await waitForElasticsearchReady();
  if (!esReady.ok) {
    console.error(
      `[smoke:elastic] Elasticsearch not ready at ES_NODE=${esNode} after 120s`,
    );
    console.error('[smoke:elastic] last error:', esReady.error ?? 'unknown');
    process.exit(1);
  }
  console.log(`[smoke:elastic] ES_NODE=${esNode} ready in ${esReady.elapsedMs}ms`);

  killPort(3000);

  let stdoutBuffer = '';
  let stderrBuffer = '';
  let child;

  async function shutdownChild() {
    if (!child) return;
    try {
      child.kill('SIGINT');
    } catch {}
    const exited = await new Promise((resolve) => {
      const timer = setTimeout(() => resolve(false), 5000);
      child.once('exit', () => {
        clearTimeout(timer);
        resolve(true);
      });
    });
    if (!exited && child.pid) {
      spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], {
        shell: true,
        stdio: 'ignore',
      });
    }
    killPort(3000);
  }

  try {
    runBuildOrThrow();
    runMigrationsOrThrow();

    child = spawn('npm', ['run', 'start:prod'], {
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, SEARCH_MODE: 'elastic' },
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

    const ready = await waitForHealth();
    if (!ready.ok) {
      console.error('[smoke:elastic] server failed to start');
      const health = await describeHealth(`${baseUrl}/health`);
      console.error(
        `[smoke:elastic] health check failed: ${baseUrl}/health (status ${health.status ?? 'no response'})`,
      );
      if (health.body) {
        console.error('[smoke:elastic] health response:', health.body);
      }
      console.error('--- stdout (tail) ---');
      console.error(tailChars(stdoutBuffer, 2000));
      console.error('--- stderr (tail) ---');
      console.error(tailChars(stderrBuffer, 2000));
      if (child.exitCode !== null) {
        console.error('[smoke:elastic] server exited with code', child.exitCode);
      }
      await shutdownChild();
      process.exit(1);
    }
    console.log('[smoke:elastic] backend health ok db=up es=up');

    const bootstrap = await requestJson(`${baseUrl}/auth/bootstrap-admin`, {
      method: 'POST',
      body: JSON.stringify({ email: adminEmail, password: adminPassword }),
    });
    if (
      !bootstrap.res.ok &&
      bootstrap.res.status !== 403 &&
      bootstrap.res.status !== 409
    ) {
      throw new Error(
        `[bootstrap] failed: ${bootstrap.res.status} ${JSON.stringify(
          bootstrap.data,
        )}`,
      );
    }

    const login = await requestJson(`${baseUrl}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: adminEmail, password: adminPassword }),
    });
    assert(login.res.ok, `[login] failed: ${login.res.status}`);
    const token = login.data?.accessToken;
    assert(token, '[login] missing accessToken');

    const reindex = await requestJson(`${baseUrl}/search/reindex`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    assert(reindex.res.ok, `[search:reindex] failed: ${reindex.res.status}`);
    console.log('[smoke:elastic] reindex ok', {
      indexed: reindex.data?.indexed,
      failed: reindex.data?.failed,
      total: reindex.data?.total,
      durationMs: reindex.data?.durationMs,
    });

    const indexDeadline = Date.now() + 30000;
    let docsCount = 0;
    while (Date.now() < indexDeadline) {
      const status = await requestJson(`${baseUrl}/search/index-status`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (status.res.ok) {
        docsCount = Number(status.data?.docsCount ?? 0);
        if (docsCount > 0) {
          break;
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    const documents = await requestJson(`${baseUrl}/documents?limit=10`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    assert(
      documents.res.ok,
      `[documents:list] failed: ${documents.res.status} ${JSON.stringify(
        documents.data,
      )}`,
    );

    const searchableDocument = unwrapListPayload(documents.data)
      .map((item) => normalizeDocumentSearchFields(item))
      .find(
        (item) =>
          typeof item.q === 'string' &&
          item.q.trim().length > 0 &&
          typeof item.documentTypeCode === 'string' &&
          item.documentTypeCode.trim().length > 0 &&
          typeof item.areaCode === 'string' &&
          item.areaCode.trim().length > 0,
      );

    assert(
      searchableDocument,
      '[documents:list] no searchable document available for elastic smoke',
    );

    const searchParams = new URLSearchParams({
      q: searchableDocument.q,
      documentTypeCode: searchableDocument.documentTypeCode,
      areaCode: searchableDocument.areaCode,
    });

    let search;
    let searchTotal = 0;
    for (let attempt = 1; attempt <= 10; attempt += 1) {
      search = await requestJson(`${baseUrl}/search?${searchParams.toString()}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
      assert(search.res.ok, `[search] failed: ${search.res.status}`);
      console.log('[smoke:elastic] engine:', search.data?.engine);
      assert(
        search.data?.engine === 'elastic',
        `[search] expected engine elastic, got ${search.data?.engine}`,
      );
      searchTotal = getSearchTotal(search.data);
      if (searchTotal >= 1) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    if (searchTotal < 1) {
      console.error('[search] response:', JSON.stringify(search?.data));
      throw new Error('[search] expected at least 1 result after retries');
    }

    console.log('[smoke:elastic] ok');

    await shutdownChild();
  } catch (error) {
    await shutdownChild();
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('[smoke:elastic] error:', error.message);
    process.exit(1);
  });
