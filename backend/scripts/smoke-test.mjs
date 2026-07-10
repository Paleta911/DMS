import fs from 'fs';
import os from 'os';
import path from 'path';
import axios from 'axios';
import FormData from 'form-data';
import { spawn, spawnSync } from 'child_process';
import {
  resolveInfraEnv,
  waitForDependency,
  checkSqlReady,
} from './lib/infra-utils.mjs';

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
  // Unified JSON/text parsing keeps smoke assertions resilient to non-JSON failures.
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
  // Retries target transient socket resets common during local startup races.
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
  // Poll conservador (~60s por default) para backend recien migrado/levantado.
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
  // Limpia procesos residuales para evitar colisiones en arranques repetidos locales.
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
  // Generates a tiny in-memory PDF fixture for upload/indexing validation.
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
  push(
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
  );

  const xrefOffset = offset;
  push('xref\n0 6\n0000000000 65535 f \n');
  for (let i = 1; i <= 5; i += 1) {
    push(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`);
  }
  push('trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n');
  push(`${xrefOffset}\n%%EOF\n`);

  return Buffer.from(parts.join(''), 'ascii');
}

async function ensureServer(url) {
  const healthUrl = `${url}/health`;
  // Orquesta readiness de infraestructura antes de iniciar backend productivo.
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
  let tmpDir;
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

    const areasResponse = await requestJson(`${baseUrl}/area-codes?limit=100`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    assert(
      areasResponse.res.ok,
      `[area-codes:list] failed: ${areasResponse.res.status} ${JSON.stringify(
        areasResponse.data,
      )}`,
    );
    let activeAreas = unwrapListPayload(areasResponse.data).filter(
      (area) => area?.activo !== false,
    );
    while (activeAreas.length < 2) {
      const suffix = String(Date.now() + activeAreas.length).slice(-4);
      const createdArea = await requestJson(`${baseUrl}/area-codes`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          code: `SM${suffix}`,
          nombre: `Smoke Area ${suffix}`,
          activo: true,
        }),
      });
      assert(
        createdArea.res.ok,
        `[area-codes:create] failed: ${createdArea.res.status} ${JSON.stringify(
          createdArea.data,
        )}`,
      );
      activeAreas.push(createdArea.data);
    }
    const primaryAreaCode = activeAreas[0].code;
    const secondaryAreaCode = activeAreas[1].code;

    const documentTypesResponse = await requestJson(
      `${baseUrl}/document-types?limit=100`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    assert(
      documentTypesResponse.res.ok,
      `[document-types:list] failed: ${documentTypesResponse.res.status} ${JSON.stringify(
        documentTypesResponse.data,
      )}`,
    );
    let activeDocumentTypes = unwrapListPayload(
      documentTypesResponse.data,
    ).filter((documentType) => documentType?.activo !== false);
    if (activeDocumentTypes.length === 0) {
      const suffix = String(Date.now()).slice(-4);
      const createdDocumentType = await requestJson(
        `${baseUrl}/document-types`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            code: `SM${suffix}`,
            nombreLargo: `Smoke Type ${suffix}`,
            activo: true,
          }),
        },
      );
      assert(
        createdDocumentType.res.ok,
        `[document-types:create] failed: ${createdDocumentType.res.status} ${JSON.stringify(
          createdDocumentType.data,
        )}`,
      );
      activeDocumentTypes = [createdDocumentType.data];
    }
    const documentTypeCode = activeDocumentTypes[0].code;

    const buildAdminUserPayload = (email, password, label) => ({
      nombre: `Smoke ${label}`,
      primerApellido: 'Test',
      segundoApellido: 'User',
      email,
      telefono: '2280000000',
      fechaNacimiento: '1998-01-15',
      password,
      confirmPassword: password,
    });

    const createApprovedUser = async (label, password) => {
      const email = `${label}-${Date.now()}@local.com`;
      const created = await requestJson(`${baseUrl}/auth/register`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(buildAdminUserPayload(email, password, label)),
      });
      assert(
        created.res.ok,
        `[${label}:create] failed: ${created.res.status} ${JSON.stringify(
          created.data,
        )}`,
      );
      assert(
        created.data?.status === 'APPROVED',
        `[${label}:create] expected APPROVED, got ${created.data?.status}`,
      );
      return { id: created.data.id, email, password };
    };

    const assignUserAreas = async (userId, label, areaCodes) => {
      const result = await requestJson(`${baseUrl}/users/${userId}/areas`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ areaCodes }),
      });
      assert(
        result.res.ok,
        `[${label}:areas] failed: ${result.res.status} ${JSON.stringify(
          result.data,
        )}`,
      );
      return result.data;
    };

    const loginUserWithPassword = async ({ email, password }, label) => {
      const loginResult = await requestJson(`${baseUrl}/auth/login`, {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      assert(
        loginResult.res.ok,
        `[login:${label}] failed: ${loginResult.res.status} ${JSON.stringify(
          loginResult.data,
        )}`,
      );
      const accessToken = loginResult.data?.accessToken;
      assert(accessToken, `[login:${label}] missing accessToken`);
      return accessToken;
    };

    const newUser = await createApprovedUser('user', 'User1234');
    const reviewerUser = await createApprovedUser('reviewer', 'Reviewer123');
    const approverUser = await createApprovedUser('approver', 'Approver123');

    await assignUserAreas(newUser.id, 'user', [primaryAreaCode]);
    await assignUserAreas(reviewerUser.id, 'reviewer', [primaryAreaCode]);
    await assignUserAreas(approverUser.id, 'approver', [primaryAreaCode]);

    const userToken = await loginUserWithPassword(newUser, 'user');
    const reviewerToken = await loginUserWithPassword(reviewerUser, 'reviewer');
    const approverToken = await loginUserWithPassword(approverUser, 'approver');

    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dms-'));
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
      form.append('documentTypeCode', documentTypeCode);
      form.append('areaCode', primaryAreaCode);
      return form;
    };

    const uploadRes = await postMultipartWithRetry(
      buildUploadForm,
      `${baseUrl}/documents/upload`,
      userToken,
    );
    const uploadData = uploadRes.data;
    assert(
      uploadRes.status >= 200 && uploadRes.status < 300,
      `[documents:upload] failed: ${uploadRes.status} ${JSON.stringify(
        uploadData,
      )}`,
    );
    const documentId = uploadData.documentId;
    const versionId = uploadData.versionId;
    const codigo = uploadData.codigo;
    assert(documentId && versionId, '[documents:upload] missing ids');
    assert(
      typeof codigo === 'string' &&
        codigo.startsWith(`${documentTypeCode}-${primaryAreaCode}-`),
      `[documents:upload] invalid codigo ${codigo}`,
    );

    const docNameSecondary = `Doc-Secondary-${Date.now()}`;
    const buildSecondaryUploadForm = () => {
      const form = new FormData();
      const fileBuffer = fs.readFileSync(filePath);
      form.append('file', fileBuffer, {
        filename: 'smoke-secondary.pdf',
        contentType: 'application/pdf',
      });
      form.append('nombreDocumento', docNameSecondary);
      form.append('comentario', 'Admin upload secondary');
      form.append('categoryId', String(categoryId));
      form.append('documentTypeCode', documentTypeCode);
      form.append('areaCode', secondaryAreaCode);
      return form;
    };

    const uploadSecondaryRes = await postMultipartWithRetry(
      buildSecondaryUploadForm,
      `${baseUrl}/documents/upload`,
      token,
    );
    const uploadSecondaryData = uploadSecondaryRes.data;
    assert(
      uploadSecondaryRes.status >= 200 && uploadSecondaryRes.status < 300,
      `[documents:upload:secondary] failed: ${uploadSecondaryRes.status} ${JSON.stringify(
        uploadSecondaryData,
      )}`,
    );
    const documentIdSecondary = uploadSecondaryData.documentId;
    const versionIdSecondary = uploadSecondaryData.versionId;
    assert(
      documentIdSecondary && versionIdSecondary,
      '[documents:upload:secondary] missing ids',
    );

    const assignWorkflow = await requestJson(
      `${baseUrl}/documents/${documentId}/assign-reviewers`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          revisoUserId: reviewerUser.id,
          aproboUserId: approverUser.id,
        }),
      },
    );
    assert(
      assignWorkflow.res.ok,
      `[workflow:assign] failed: ${assignWorkflow.res.status} ${JSON.stringify(
        assignWorkflow.data,
      )}`,
    );

    const submitReview = await requestJson(
      `${baseUrl}/documents/${documentId}/submit-review`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${userToken}` },
      },
    );
    assert(
      submitReview.res.ok,
      `[workflow:submit] failed: ${submitReview.res.status} ${JSON.stringify(
        submitReview.data,
      )}`,
    );

    const reviewDecision = await requestJson(
      `${baseUrl}/documents/${documentId}/review`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${reviewerToken}` },
        body: JSON.stringify({ decision: 'APPROVED', comentario: 'OK' }),
      },
    );
    assert(
      reviewDecision.res.ok,
      `[workflow:review] failed: ${reviewDecision.res.status} ${JSON.stringify(
        reviewDecision.data,
      )}`,
    );

    const approveDecision = await requestJson(
      `${baseUrl}/documents/${documentId}/approve`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${approverToken}` },
        body: JSON.stringify({ decision: 'APPROVED', comentario: 'OK' }),
      },
    );
    assert(
      approveDecision.res.ok,
      `[workflow:approve] failed: ${approveDecision.res.status} ${JSON.stringify(
        approveDecision.data,
      )}`,
    );

    const workflowStatus = await requestJson(
      `${baseUrl}/documents/${documentId}/workflow`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${userToken}` },
      },
    );
    assert(
      workflowStatus.res.ok,
      `[workflow:get] failed: ${workflowStatus.res.status} ${JSON.stringify(
        workflowStatus.data,
      )}`,
    );
    assert(
      workflowStatus.data?.status === 'APPROVED',
      `[workflow:get] expected APPROVED, got ${workflowStatus.data?.status}`,
    );

    const match = typeof codigo === 'string' ? codigo.split('-').pop() : null;
    const consecutivo = match ? Number(match) : null;
    assert(consecutivo, '[documents:upload] missing consecutivo');

    const buildUploadV2Form = () => {
      const formNewVersion = new FormData();
      const fileBuffer = fs.readFileSync(filePath);
      formNewVersion.append('file', fileBuffer, {
        filename: 'smoke-v2.pdf',
        contentType: 'application/pdf',
      });
      formNewVersion.append('nombreDocumento', `Doc-V2-${Date.now()}`);
      formNewVersion.append('comentario', 'New version');
      formNewVersion.append('categoryId', String(categoryId));
      formNewVersion.append('documentTypeCode', documentTypeCode);
      formNewVersion.append('areaCode', primaryAreaCode);
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
      `[documents:upload:v2] failed: ${uploadNewVersionRes.status} ${JSON.stringify(
        uploadNewVersionData,
      )}`,
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
      workflowAfterReset.res.ok,
      `[workflow:reset:get] failed: ${workflowAfterReset.res.status} ${JSON.stringify(
        workflowAfterReset.data,
      )}`,
    );
    assert(
      workflowAfterReset.data?.status === 'DRAFT',
      `[workflow:reset] expected DRAFT, got ${workflowAfterReset.data?.status}`,
    );

    const documents = await requestJson(`${baseUrl}/documents`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${userToken}` },
    });
    assert(
      documents.res.ok,
      `[documents:list] failed: ${documents.res.status} ${JSON.stringify(
        documents.data,
      )}`,
    );
    const listedDocuments = documents.data?.items ?? [];
    assert(
      listedDocuments.some(
        (document) => Number(document.id) === Number(documentId),
      ),
      '[documents:list] missing primary document',
    );
    assert(
      listedDocuments.some(
        (document) => Number(document.id) === Number(documentIdSecondary),
      ),
      '[documents:list] missing secondary document',
    );

    const versions = await requestJson(
      `${baseUrl}/documents/${documentId}/versions`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${userToken}` },
      },
    );
    assert(
      versions.res.ok,
      `[versions:list] failed: ${versions.res.status} ${JSON.stringify(
        versions.data,
      )}`,
    );
    assert(
      Array.isArray(versions.data) && versions.data.length >= 2,
      '[versions:list] expected at least 2 versions',
    );

    const directVersions = await requestJson(
      `${baseUrl}/versions/${documentId}`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${userToken}` },
      },
    );
    assert(
      directVersions.res.ok,
      `[versions:direct-list] failed: ${directVersions.res.status} ${JSON.stringify(
        directVersions.data,
      )}`,
    );

    const downloadRes = await fetchOrThrow(
      `${baseUrl}/versions/${versionId}/download`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${userToken}` },
      },
    );
    assert(downloadRes.ok, `[versions:download] failed: ${downloadRes.status}`);
    const downloadBuffer = Buffer.from(await downloadRes.arrayBuffer());
    assert(downloadBuffer.length > 0, '[versions:download] empty file');

    const crossAreaDocument = await requestJson(
      `${baseUrl}/documents/${documentIdSecondary}`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${userToken}` },
      },
    );
    assert(
      crossAreaDocument.res.ok,
      `[documents:cross-area] failed: ${crossAreaDocument.res.status} ${JSON.stringify(
        crossAreaDocument.data,
      )}`,
    );

    const crossAreaVersions = await requestJson(
      `${baseUrl}/documents/${documentIdSecondary}/versions`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${userToken}` },
      },
    );
    assert(
      crossAreaVersions.res.ok,
      `[documents:cross-area:versions] failed: ${crossAreaVersions.res.status} ${JSON.stringify(
        crossAreaVersions.data,
      )}`,
    );

    const crossAreaDirectVersions = await requestJson(
      `${baseUrl}/versions/${documentIdSecondary}`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${userToken}` },
      },
    );
    assert(
      crossAreaDirectVersions.res.ok,
      `[versions:cross-area] failed: ${crossAreaDirectVersions.res.status} ${JSON.stringify(
        crossAreaDirectVersions.data,
      )}`,
    );

    const crossAreaDownload = await fetchOrThrow(
      `${baseUrl}/versions/${versionIdSecondary}/download`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${userToken}` },
      },
    );
    assert(
      crossAreaDownload.ok,
      `[download:cross-area] failed: ${crossAreaDownload.status}`,
    );
    const crossAreaDownloadBuffer = Buffer.from(
      await crossAreaDownload.arrayBuffer(),
    );
    assert(
      crossAreaDownloadBuffer.length > 0,
      '[download:cross-area] empty file',
    );

    const reindex = await requestJson(`${baseUrl}/search/reindex`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    assert(
      reindex.res.ok,
      `[search:reindex] failed: ${reindex.res.status} ${JSON.stringify(
        reindex.data,
      )}`,
    );

    let primarySearch;
    let primarySearchTotal = 0;
    const primarySearchParams = new URLSearchParams({
      q: docName,
      documentTypeCode,
      areaCode: primaryAreaCode,
    });
    for (let attempt = 1; attempt <= 10; attempt += 1) {
      primarySearch = await requestJson(
        `${baseUrl}/search?${primarySearchParams.toString()}`,
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${userToken}` },
        },
      );
      assert(
        primarySearch.res.ok,
        `[search:primary] failed: ${primarySearch.res.status} ${JSON.stringify(
          primarySearch.data,
        )}`,
      );
      if (expectedSearchEngine) {
        assert(
          primarySearch.data?.engine === expectedSearchEngine,
          `[search] expected engine ${expectedSearchEngine}, got ${primarySearch.data?.engine}`,
        );
      }
      primarySearchTotal = getSearchTotal(primarySearch.data);
      if (primarySearchTotal >= 1) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    if (primarySearchTotal < 1) {
      console.error(
        '[search:primary] response:',
        JSON.stringify(primarySearch?.data),
      );
      throw new Error(
        '[search:primary] expected at least 1 result after retries',
      );
    }

    let secondarySearch;
    let secondarySearchTotal = 0;
    const secondarySearchParams = new URLSearchParams({
      q: docNameSecondary,
      documentTypeCode,
      areaCode: secondaryAreaCode,
    });
    for (let attempt = 1; attempt <= 10; attempt += 1) {
      secondarySearch = await requestJson(
        `${baseUrl}/search?${secondarySearchParams.toString()}`,
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${userToken}` },
        },
      );
      assert(
        secondarySearch.res.ok,
        `[search:cross-area] failed: ${secondarySearch.res.status} ${JSON.stringify(
          secondarySearch.data,
        )}`,
      );
      secondarySearchTotal = getSearchTotal(secondarySearch.data);
      if (secondarySearchTotal >= 1) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    if (secondarySearchTotal < 1) {
      console.error(
        '[search:cross-area] response:',
        JSON.stringify(secondarySearch?.data),
      );
      throw new Error(
        '[search:cross-area] expected at least 1 result after retries',
      );
    }

    const auditLogs = await requestJson(
      `${baseUrl}/audit-logs?page=1&limit=100`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    assert(
      auditLogs.res.ok,
      `[audit-logs] failed: ${auditLogs.res.status} ${JSON.stringify(
        auditLogs.data,
      )}`,
    );
    const actions = (auditLogs.data?.items ?? []).map((item) => item.action);
    const requiredActions = [
      'WORKFLOW_ASSIGN',
      'WORKFLOW_SUBMIT',
      'WORKFLOW_REVIEW_DECISION',
      'WORKFLOW_APPROVAL_DECISION',
      'WORKFLOW_RESET_ON_NEW_VERSION',
      'VERSION_DOWNLOAD',
      'SEARCH_QUERY',
    ];
    for (const action of requiredActions) {
      assert(actions.includes(action), `[audit-logs] missing ${action}`);
    }

    console.log('[smoke] done');
  } finally {
    if (tmpDir) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
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
