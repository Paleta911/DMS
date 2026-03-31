import fs from 'fs';
import os from 'os';
import path from 'path';
import axios from 'axios';
import FormData from 'form-data';
import { spawn, spawnSync } from 'child_process';
import { resolveInfraEnv, waitForDependency, checkSqlReady } from './lib/infra-utils.mjs';

const baseUrl = process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:3000';
const adminEmail = process.env.SMOKE_ADMIN_EMAIL ?? 'admin@local.com';
const adminPassword = process.env.SMOKE_ADMIN_PASSWORD ?? 'Admin123';
const expectedSearchEngine = process.env.SMOKE_EXPECT_ENGINE;
const infraEnv = resolveInfraEnv();

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

async function fetchOrThrow(url, options) {
  try {
    return await fetch(url, options);
  } catch (error) {
    throw new Error(`[request] failed ${url}: ${error.message}`);
  }
}

async function postMultipart(url, form, token) {
  const headers = {
    ...form.getHeaders(),
    Authorization: `Bearer ${token}`,
  };
  return axios.post(url, form, {
    headers,
    maxBodyLength: Infinity,
    validateStatus: () => true,
  });
}

async function postMultipartWithRetry(buildForm, url, token, retries = 2) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const form = buildForm();
    try {
      return await postMultipart(url, form, token);
    } catch (error) {
      lastError = error;
      if (error?.code !== 'ECONNRESET' || attempt === retries) {
        const status = error?.response?.status;
        const data = error?.response?.data;
        const details = status
          ? `status ${status} ${JSON.stringify(data)}`
          : `code ${error?.code ?? 'unknown'}`;
        throw new Error(`[upload] failed ${url}: ${details}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  throw lastError;
}

async function waitForHealth(url, attempts = 120, delayMs = 500) {
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

function runMigrationsOrThrow() {
  const result = spawnSync('npm', ['run', 'db:migration:run'], {
    encoding: 'utf8',
    shell: true,
  });
  if (result.status !== 0) {
    console.error('[smoke] migration failed');
    console.error(result.stdout ?? '');
    console.error(result.stderr ?? '');
    throw new Error('[smoke] migration failed');
  }
}

function runBuildOrThrow() {
  const result = spawnSync('npm', ['run', 'build'], {
    encoding: 'utf8',
    shell: true,
  });
  if (result.status !== 0) {
    console.error('[smoke] build failed');
    console.error(result.stdout ?? '');
    console.error(result.stderr ?? '');
    throw new Error('[smoke] build failed');
  }
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

function buildPdfBuffer(text) {
  const safeText = String(text).replace(/([()\\])/g, '\\$1');
  const parts = [];
  const offsets = [];
  let offset = 0;
  const push = (chunk) => {
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
  for (let i = 1; i <= 5; i += 1) {
    push(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`);
  }
  push('trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n');
  push(`${xrefOffset}\n%%EOF\n`);

  return Buffer.from(parts.join(''), 'ascii');
}

async function ensureServer(baseUrl) {
  const healthUrl = `${baseUrl}/health`;
  killPort(3000);
  const db = await waitForDependency({
    label: `sqlserver ${infraEnv.dbHost}:${infraEnv.dbPort}`,
    timeoutMs: 120000,
    checker: () =>
      checkSqlReady({
        host: infraEnv.dbHost,
        port: infraEnv.dbPort,
        user: infraEnv.dbUser,
        password: infraEnv.dbPass,
        database: 'master',
        encrypt: infraEnv.dbEncrypt,
        trustServerCertificate: infraEnv.dbTrustCert,
      }),
  });
  if (!db.ready) {
    throw new Error(
      `[smoke] SQL Server not ready at ${infraEnv.dbHost}:${infraEnv.dbPort} (${db.reason})`,
    );
  }
  const ensureDb = spawnSync('npm', ['run', 'db:ensure'], {
    encoding: 'utf8',
    shell: true,
  });
  if (ensureDb.status !== 0) {
    console.error('[smoke] db:ensure failed');
    console.error(ensureDb.stdout ?? '');
    console.error(ensureDb.stderr ?? '');
    throw new Error('[smoke] db:ensure failed');
  }
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
    console.error('[smoke] server failed to start');
    console.error('--- stdout (tail) ---');
    console.error(tail(stdoutBuffer));
    console.error('--- stderr (tail) ---');
    console.error(tail(stderrBuffer));
    if (child.exitCode !== null) {
      console.error('[smoke] server exited with code', child.exitCode);
    }
    child.kill();
    throw new Error('[smoke] server failed to start');
  }
  return child;
}

async function main() {
  console.log('[smoke] baseUrl:', baseUrl);
  let serverProcess;
  try {
    serverProcess = await ensureServer(baseUrl);

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
    console.log('[bootstrap] status:', bootstrap.res.status);

    const login = await requestJson(`${baseUrl}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: adminEmail, password: adminPassword }),
    });
    assert(login.res.ok, `[login] failed: ${login.res.status}`);
    const token = login.data?.accessToken;
    assert(token, '[login] missing accessToken');
    console.log('[login] ok');

    const categoryName = `Smoke-${Date.now()}`;
    const category = await requestJson(`${baseUrl}/categories`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ nombre: categoryName }),
    });
    assert(
      category.res.ok,
      `[categories:create] failed: ${category.res.status} ${JSON.stringify(
        category.data,
      )}`,
    );
    const categoryId = category.data?.id;
    assert(categoryId, '[categories:create] missing id');
    console.log('[categories:create] ok');

    const categories = await requestJson(`${baseUrl}/categories`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    assert(
      categories.res.ok,
      `[categories:list] failed: ${categories.res.status}`,
    );
    console.log('[categories:list] count:', categories.data?.length ?? 0);

  const newUserEmail = `user-${Date.now()}@local.com`;
  const newUserPassword = 'User1234';
  const newUser = await requestJson(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ email: newUserEmail, password: newUserPassword }),
  });
  assert(newUser.res.ok, `[users:create] failed: ${newUser.res.status}`);
  const newUserId = newUser.data?.id;
  assert(newUserId, '[users:create] missing id');

  const assignAreas = await requestJson(
    `${baseUrl}/users/${newUserId}/areas`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ areaCodes: ['RC'] }),
    },
  );
  assert(assignAreas.res.ok, `[users:areas] failed: ${assignAreas.res.status}`);

  const reviewerEmail = `reviewer-${Date.now()}@local.com`;
  const reviewerPassword = 'Reviewer123';
  const reviewerUser = await requestJson(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ email: reviewerEmail, password: reviewerPassword }),
  });
  assert(reviewerUser.res.ok, `[reviewer:create] failed: ${reviewerUser.res.status}`);
  const reviewerId = reviewerUser.data?.id;
  assert(reviewerId, '[reviewer:create] missing id');

  const approverEmail = `approver-${Date.now()}@local.com`;
  const approverPassword = 'Approver123';
  const approverUser = await requestJson(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ email: approverEmail, password: approverPassword }),
  });
  assert(approverUser.res.ok, `[approver:create] failed: ${approverUser.res.status}`);
  const approverId = approverUser.data?.id;
  assert(approverId, '[approver:create] missing id');

  const assignReviewerAreas = await requestJson(
    `${baseUrl}/users/${reviewerId}/areas`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ areaCodes: ['RC'] }),
    },
  );
  assert(assignReviewerAreas.res.ok, `[reviewer:areas] failed: ${assignReviewerAreas.res.status}`);

  const assignApproverAreas = await requestJson(
    `${baseUrl}/users/${approverId}/areas`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ areaCodes: ['RC'] }),
    },
  );
  assert(assignApproverAreas.res.ok, `[approver:areas] failed: ${assignApproverAreas.res.status}`);

  const loginUser = await requestJson(`${baseUrl}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email: newUserEmail, password: newUserPassword }),
  });
  assert(loginUser.res.ok, `[login:user] failed: ${loginUser.res.status}`);
  const userToken = loginUser.data?.accessToken;
  assert(userToken, '[login:user] missing accessToken');

  const loginReviewer = await requestJson(`${baseUrl}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email: reviewerEmail, password: reviewerPassword }),
  });
  assert(loginReviewer.res.ok, `[login:reviewer] failed: ${loginReviewer.res.status}`);
  const reviewerToken = loginReviewer.data?.accessToken;
  assert(reviewerToken, '[login:reviewer] missing accessToken');

  const loginApprover = await requestJson(`${baseUrl}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email: approverEmail, password: approverPassword }),
  });
  assert(loginApprover.res.ok, `[login:approver] failed: ${loginApprover.res.status}`);
  const approverToken = loginApprover.data?.accessToken;
  assert(approverToken, '[login:approver] missing accessToken');

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dms-'));
  const filePath = path.join(tmpDir, 'smoke.pdf');
  fs.writeFileSync(filePath, buildPdfBuffer('Smoke test PDF'));

  const docName = `Doc-${Date.now()}`;
  const buildUploadForm = () => {
    const form = new FormData();
    const fileBuffer = fs.readFileSync(filePath);
    form.append('file', fileBuffer, {
      filename: 'smoke.pdf',
      contentType: 'application/pdf',
    });
    form.append('nombreDocumento', docName);
    form.append('comentario', 'Smoke test');
    form.append('categoryId', String(categoryId));
    form.append('documentTypeCode', 'PRO');
    form.append('areaCode', 'RC');
    return form;
  };

  const uploadRes = await postMultipartWithRetry(
    buildUploadForm,
    `${baseUrl}/documents/upload`,
    userToken,
  );
  const uploadData = uploadRes.data;
  assert(uploadRes.status >= 200 && uploadRes.status < 300, `[documents:upload] failed: ${uploadRes.status}`);
  const documentId = uploadData.documentId;
  const versionId = uploadData.versionId;
  const codigo = uploadData.codigo;
  assert(documentId && versionId, '[documents:upload] missing ids');
  assert(
    typeof codigo === 'string' && /^PRO-RC-\d+$/.test(codigo),
    `[documents:upload] invalid codigo ${codigo}`,
  );
  console.log('[documents:upload] ok');

  const docNameFA = `Doc-FA-${Date.now()}`;
  const buildUploadFAForm = () => {
    const formFA = new FormData();
    const fileBufferFA = fs.readFileSync(filePath);
    formFA.append('file', fileBufferFA, {
      filename: 'smoke-fa.pdf',
      contentType: 'application/pdf',
    });
    formFA.append('nombreDocumento', docNameFA);
    formFA.append('comentario', 'Admin upload');
    formFA.append('categoryId', String(categoryId));
    formFA.append('documentTypeCode', 'PRO');
    formFA.append('areaCode', 'FA');
    return formFA;
  };

  console.log('[documents:upload:fa] start');
  const uploadFARes = await postMultipartWithRetry(
    buildUploadFAForm,
    `${baseUrl}/documents/upload`,
    token,
  );
  const uploadFAData = uploadFARes.data;
  assert(uploadFARes.status >= 200 && uploadFARes.status < 300, `[documents:upload:fa] failed: ${uploadFARes.status}`);
  const documentIdFA = uploadFAData.documentId;
  const versionIdFA = uploadFAData.versionId;
  assert(documentIdFA && versionIdFA, '[documents:upload:fa] missing ids');

  const assignWorkflow = await requestJson(
    `${baseUrl}/documents/${documentId}/assign-reviewers`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ revisoUserId: reviewerId, aproboUserId: approverId }),
    },
  );
  assert(assignWorkflow.res.ok, `[workflow:assign] failed: ${assignWorkflow.res.status}`);

  console.log('[workflow] assigned');

  console.log('[workflow] submit');
  const submitReview = await requestJson(
    `${baseUrl}/documents/${documentId}/submit-review`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${userToken}` },
    },
  );
  assert(submitReview.res.ok, `[workflow:submit] failed: ${submitReview.res.status}`);

  console.log('[workflow] review');
  const reviewDecision = await requestJson(
    `${baseUrl}/documents/${documentId}/review`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${reviewerToken}` },
      body: JSON.stringify({ decision: 'APPROVED', comentario: 'OK' }),
    },
  );
  assert(reviewDecision.res.ok, `[workflow:review] failed: ${reviewDecision.res.status}`);

  console.log('[workflow] approve');
  const approveDecision = await requestJson(
    `${baseUrl}/documents/${documentId}/approve`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${approverToken}` },
      body: JSON.stringify({ decision: 'APPROVED', comentario: 'OK' }),
    },
  );
  assert(approveDecision.res.ok, `[workflow:approve] failed: ${approveDecision.res.status}`);

  const workflowStatus = await requestJson(
    `${baseUrl}/documents/${documentId}/workflow`,
    {
      method: 'GET',
      headers: { Authorization: `Bearer ${userToken}` },
    },
  );
  assert(workflowStatus.res.ok, `[workflow:get] failed: ${workflowStatus.res.status}`);
  assert(
    workflowStatus.data?.status === 'APPROVED',
    `[workflow:get] expected APPROVED, got ${workflowStatus.data?.status}`,
  );

  const match = typeof codigo === 'string' ? codigo.split('-').pop() : null;
  const consecutivo = match ? Number(match) : null;
  assert(consecutivo, '[documents:upload] missing consecutivo');

  const docNameV2 = `Doc-${Date.now()}`;
  const buildUploadV2Form = () => {
    const formNewVersion = new FormData();
    const fileBufferV2 = fs.readFileSync(filePath);
    formNewVersion.append('file', fileBufferV2, {
      filename: 'smoke-v2.pdf',
      contentType: 'application/pdf',
    });
    formNewVersion.append('nombreDocumento', docNameV2);
    formNewVersion.append('comentario', 'New version');
    formNewVersion.append('categoryId', String(categoryId));
    formNewVersion.append('documentTypeCode', 'PRO');
    formNewVersion.append('areaCode', 'RC');
    formNewVersion.append('consecutivo', String(consecutivo));
    return formNewVersion;
  };

  const uploadNewVersionRes = await postMultipartWithRetry(
    buildUploadV2Form,
    `${baseUrl}/documents/upload`,
    userToken,
  );
  const uploadNewVersionData = uploadNewVersionRes.data;
  assert(
    uploadNewVersionRes.status >= 200 && uploadNewVersionRes.status < 300,
    `[documents:upload:v2] failed: ${uploadNewVersionRes.status}`,
  );
  assert(
    uploadNewVersionData.documentId === documentId,
    '[documents:upload:v2] should reuse document',
  );

  const workflowAfterReset = await requestJson(
    `${baseUrl}/documents/${documentId}/workflow`,
    {
      method: 'GET',
      headers: { Authorization: `Bearer ${userToken}` },
    },
  );
  assert(
    workflowAfterReset.data?.status === 'DRAFT',
    `[workflow:reset] expected DRAFT, got ${workflowAfterReset.data?.status}`,
  );

  const documents = await requestJson(`${baseUrl}/documents`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${userToken}` },
  });
  assert(documents.res.ok, `[documents:list] failed: ${documents.res.status}`);
  console.log('[documents:list] total:', documents.data?.total ?? 0);

  const versions = await requestJson(`${baseUrl}/documents/${documentId}/versions`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${userToken}` },
  });
  assert(versions.res.ok, `[versions:list] failed: ${versions.res.status}`);
  console.log('[versions:list] count:', versions.data?.length ?? 0);

  const downloadRes = await fetchOrThrow(`${baseUrl}/versions/${versionId}/download`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${userToken}` },
  });
  assert(downloadRes.ok, `[versions:download] failed: ${downloadRes.status}`);
  const downloadBuffer = Buffer.from(await downloadRes.arrayBuffer());
  assert(downloadBuffer.length > 0, '[versions:download] empty file');
  console.log('[versions:download] ok, size:', downloadBuffer.length);

  const forbiddenDoc = await requestJson(`${baseUrl}/documents/${documentIdFA}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${userToken}` },
  });
  assert(
    forbiddenDoc.res.status === 403,
    `[documents:forbidden] expected 403, got ${forbiddenDoc.res.status}`,
  );

  const forbiddenVersions = await requestJson(
    `${baseUrl}/documents/${documentIdFA}/versions`,
    {
      method: 'GET',
      headers: { Authorization: `Bearer ${userToken}` },
    },
  );
  assert(
    forbiddenVersions.res.status === 403,
    `[versions:forbidden] expected 403, got ${forbiddenVersions.res.status}`,
  );

  const forbiddenDownload = await fetchOrThrow(
    `${baseUrl}/versions/${versionIdFA}/download`,
    {
      method: 'GET',
      headers: { Authorization: `Bearer ${userToken}` },
    },
  );
  assert(
    forbiddenDownload.status === 403,
    `[download:forbidden] expected 403, got ${forbiddenDownload.status}`,
  );

  const reindex = await requestJson(`${baseUrl}/search/reindex`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  assert(reindex.res.ok, `[search:reindex] failed: ${reindex.res.status}`);
  console.log('[search:reindex] ok');

  let search;
  let searchTotal = 0;
  for (let attempt = 1; attempt <= 10; attempt += 1) {
    search = await requestJson(
      `${baseUrl}/search?q=PRO&documentTypeCode=PRO&areaCode=RC`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${userToken}` },
      },
    );
    assert(search.res.ok, `[search] failed: ${search.res.status}`);
    console.log('[search] engine:', search.data?.engine);
    if (expectedSearchEngine) {
      assert(
        search.data?.engine === expectedSearchEngine,
        `[search] expected engine ${expectedSearchEngine}, got ${search.data?.engine}`,
      );
    }
    searchTotal =
      typeof search.data?.total === 'number'
        ? search.data.total
        : search.data?.total?.value ?? 0;
    if (searchTotal >= 1) {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  if (searchTotal < 1) {
    console.error('[search] response:', JSON.stringify(search?.data));
    throw new Error('[search] expected at least 1 result after retries');
  }
  console.log('[search] ok');

  const forbiddenSearch = await requestJson(
    `${baseUrl}/search?areaCode=FA`,
    {
      method: 'GET',
      headers: { Authorization: `Bearer ${userToken}` },
    },
  );
  assert(
    forbiddenSearch.res.status === 403,
    `[search:forbidden] expected 403, got ${forbiddenSearch.res.status}`,
  );

  const auditLogs = await requestJson(
    `${baseUrl}/audit-logs?page=1&limit=50`,
    {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  assert(auditLogs.res.ok, `[audit-logs] failed: ${auditLogs.res.status}`);
  const actions = (auditLogs.data?.items ?? []).map((item) => item.action);
  const requiredActions = [
    'WORKFLOW_ASSIGN',
    'WORKFLOW_SUBMIT',
    'WORKFLOW_REVIEW_DECISION',
    'WORKFLOW_APPROVAL_DECISION',
    'WORKFLOW_RESET_ON_NEW_VERSION',
  ];
  for (const action of requiredActions) {
    assert(actions.includes(action), `[audit-logs] missing ${action}`);
  }

    console.log('[smoke] done');
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

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('[smoke] error:', error.message);
    process.exit(1);
  });
