import { spawn, spawnSync } from 'child_process';
import { resolveInfraEnv, waitForDependency, checkSqlReady } from './lib/infra-utils.mjs';

const baseUrl = process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:3000';
const adminEmail = process.env.SMOKE_ADMIN_EMAIL ?? 'admin@local.com';
const adminPassword = process.env.SMOKE_ADMIN_PASSWORD ?? 'Admin123';
const allowedDomain = process.env.ALLOWED_EMAIL_DOMAIN ?? 'bsm.com.mx';
const infraEnv = resolveInfraEnv();

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

async function waitForHealth(url, attempts = 120, delayMs = 500) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        return true;
      }
    } catch {}
    await delay(delayMs);
  }
  return false;
}

function runMigrationsOrThrow() {
  const result = spawnSync('npm', ['run', 'db:migration:run'], {
    encoding: 'utf8',
    shell: true,
  });
  if (result.status !== 0) {
    console.error('[smoke:registration] migration failed');
    console.error(result.stdout ?? '');
    console.error(result.stderr ?? '');
    throw new Error('[smoke:registration] migration failed');
  }
}

function runBuildOrThrow() {
  const result = spawnSync('npm', ['run', 'build'], {
    encoding: 'utf8',
    shell: true,
  });
  if (result.status !== 0) {
    console.error('[smoke:registration] build failed');
    console.error(result.stdout ?? '');
    console.error(result.stderr ?? '');
    throw new Error('[smoke:registration] build failed');
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

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractOtp(logText, email) {
  const patterns = [
    new RegExp(
      `\\[email\\]\\[console\\] verification code for ${escapeRegex(email)}: (\\d{6})`,
      'gi',
    ),
    new RegExp(
      `\\[email_console_delivery\\] Codigo de verificacion simulado para ${escapeRegex(email)}[^\\r\\n]*code=(\\d{6})`,
      'gi',
    ),
    new RegExp(
      `"event":"email_console_delivery"[^\\r\\n]*"message":"Codigo de verificacion simulado para ${escapeRegex(email)}"[^\\r\\n]*"code":"?(\\d{6})"?`,
      'gi',
    ),
  ];

  let lastCode = null;
  for (const regex of patterns) {
    let match;
    while ((match = regex.exec(logText)) !== null) {
      lastCode = match[1];
    }
  }
  return lastCode;
}

async function waitForOtp(getLogs, email, timeoutMs = 20000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt <= timeoutMs) {
    const otp = extractOtp(getLogs(), email);
    if (otp) {
      return otp;
    }
    await delay(250);
  }
  throw new Error(
    `[smoke:registration] otp not found in console logs for ${email}`,
  );
}

async function ensureServer(url) {
  const healthUrl = `${url}/health`;
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
      `[smoke:registration] SQL Server not ready at ${infraEnv.dbHost}:${infraEnv.dbPort} (${db.reason})`,
    );
  }
  const ensureDb = spawnSync('npm', ['run', 'db:ensure'], {
    encoding: 'utf8',
    shell: true,
  });
  if (ensureDb.status !== 0) {
    console.error('[smoke:registration] db:ensure failed');
    console.error(ensureDb.stdout ?? '');
    console.error(ensureDb.stderr ?? '');
    throw new Error('[smoke:registration] db:ensure failed');
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

  const ready = await waitForHealth(healthUrl, 120, 500);
  if (!ready) {
    const tail = (text) => text.split(/\r?\n/).slice(-200).join('\n');
    console.error('[smoke:registration] server failed to start');
    console.error('--- stdout (tail) ---');
    console.error(tail(stdoutBuffer));
    console.error('--- stderr (tail) ---');
    console.error(tail(stderrBuffer));
    child.kill();
    throw new Error('[smoke:registration] server failed to start');
  }

  return {
    child,
    getStdout: () => stdoutBuffer,
  };
}

async function stopServer(child) {
  if (!child) {
    return;
  }
  child.kill();
  const exited = await new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), 5000);
    child.once('exit', () => {
      clearTimeout(timer);
      resolve(true);
    });
  });
  if (!exited && child.pid) {
    spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], {
      shell: true,
      stdio: 'ignore',
    });
  }
}

async function main() {
  console.log('[smoke:registration] baseUrl:', baseUrl);
  let server;
  try {
    server = await ensureServer(baseUrl);

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
    console.log('[smoke:registration] bootstrap status:', bootstrap.res.status);

    const loginAdmin = await requestJson(`${baseUrl}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: adminEmail, password: adminPassword }),
    });
    assert(
      loginAdmin.res.ok,
      `[admin:login] failed: ${loginAdmin.res.status}`,
    );
    const adminToken = loginAdmin.data?.accessToken;
    assert(adminToken, '[admin:login] missing accessToken');

    const email = `registro-${Date.now()}@${allowedDomain}`;
    const password = 'User1234';
    const register = await requestJson(`${baseUrl}/auth/register`, {
      method: 'POST',
      body: JSON.stringify({
        nombre: 'Registro',
        primerApellido: 'Prueba',
        segundoApellido: 'Demo',
        email,
        telefono: '2280000000',
        fechaNacimiento: '1998-01-15',
        password,
        confirmPassword: password,
      }),
    });
    assert(
      register.res.ok,
      `[register] failed: ${register.res.status} ${JSON.stringify(register.data)}`,
    );
    const userId = register.data?.id;
    assert(userId, '[register] missing user id');
    assert(
      register.data?.status === 'PENDING_VERIFICATION',
      `[register] expected PENDING_VERIFICATION, got ${register.data?.status}`,
    );
    console.log('[smoke:registration] register ok');

    const pendingLogin = await requestJson(`${baseUrl}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    assert(
      pendingLogin.res.status === 403,
      `[login:pending-verification] expected 403, got ${pendingLogin.res.status}`,
    );

    const otp = await waitForOtp(server.getStdout, email);
    console.log('[smoke:registration] otp captured');

    const verify = await requestJson(`${baseUrl}/auth/verify-email`, {
      method: 'POST',
      body: JSON.stringify({ email, code: otp }),
    });
    assert(
      verify.res.ok,
      `[verify-email] failed: ${verify.res.status} ${JSON.stringify(verify.data)}`,
    );
    assert(
      verify.data?.status === 'PENDING_APPROVAL',
      `[verify-email] expected PENDING_APPROVAL, got ${verify.data?.status}`,
    );
    console.log('[smoke:registration] verify-email ok');

    const pendingApprovalLogin = await requestJson(`${baseUrl}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    assert(
      pendingApprovalLogin.res.status === 403,
      `[login:pending-approval] expected 403, got ${pendingApprovalLogin.res.status}`,
    );

    const approve = await requestJson(
      `${baseUrl}/admin/registrations/${userId}/approve`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      },
    );
    assert(
      approve.res.ok,
      `[approve-registration] failed: ${approve.res.status} ${JSON.stringify(approve.data)}`,
    );
    console.log('[smoke:registration] approve ok');

    const approvedLogin = await requestJson(`${baseUrl}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    assert(
      approvedLogin.res.ok,
      `[login:approved] failed: ${approvedLogin.res.status} ${JSON.stringify(approvedLogin.data)}`,
    );
    const userToken = approvedLogin.data?.accessToken;
    assert(userToken, '[login:approved] missing accessToken');

    const me = await requestJson(`${baseUrl}/users/me`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${userToken}` },
    });
    assert(me.res.ok, `[users:me] failed: ${me.res.status}`);
    assert(
      me.data?.status === 'APPROVED',
      `[users:me] expected APPROVED, got ${me.data?.status}`,
    );
    assert(
      me.data?.permissions?.canAccess === true &&
        me.data?.permissions?.canRead === true,
      '[users:me] expected default ACCESS+READ enabled',
    );
    assert(
      me.data?.permissions?.canUpload === false &&
        me.data?.permissions?.canUploadNewVersion === false &&
        me.data?.permissions?.canReview === false &&
        me.data?.permissions?.canApprove === false &&
        me.data?.permissions?.canDelete === false,
      '[users:me] expected non-default permissions disabled',
    );
    console.log('[smoke:registration] default permissions ok');

    const audits = await requestJson(`${baseUrl}/audit-logs?page=1&limit=100`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      audits.res.ok,
      `[audit-logs] failed: ${audits.res.status} ${JSON.stringify(audits.data)}`,
    );
    const items = audits.data?.items ?? [];
    const hasAction = (action, predicate) =>
      items.some((item) => item.action === action && predicate(item));

    assert(
      hasAction('REGISTER', (item) => item.resourceId === String(userId)),
      `[audit-logs] missing REGISTER for user ${userId}`,
    );
    assert(
      hasAction('EMAIL_SENT', (item) => item.resourceId === String(userId)),
      `[audit-logs] missing EMAIL_SENT for user ${userId}`,
    );
    assert(
      hasAction(
        'EMAIL_VERIFIED',
        (item) => Number(item.userId ?? 0) === Number(userId),
      ),
      `[audit-logs] missing EMAIL_VERIFIED for user ${userId}`,
    );
    assert(
      hasAction('REG_APPROVED', (item) => item.resourceId === String(userId)),
      `[audit-logs] missing REG_APPROVED for user ${userId}`,
    );
    console.log('[smoke:registration] audit trail ok');

    console.log('[smoke:registration] done');
  } finally {
    await stopServer(server?.child);
    killPort(3000);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('[smoke:registration] error:', error.message);
    process.exit(1);
  });
