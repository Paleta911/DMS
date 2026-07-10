import * as bcrypt from 'bcrypt';
import sql from 'mssql';
import path from 'node:path';
import { config as dotenvConfig } from 'dotenv';

dotenvConfig({ path: path.resolve(process.cwd(), '.env') });

// DB helper layer for browser e2e tests: provisions users/data and polls DB-side state transitions.
type PermissionFlags = {
  canAccess?: boolean;
  canRead?: boolean;
  canUpload?: boolean;
  canUploadNewVersion?: boolean;
  canReview?: boolean;
  canApprove?: boolean;
  canDelete?: boolean;
};

type ApprovedUserInput = {
  email: string;
  password: string;
  nombre: string;
  primerApellido: string;
  segundoApellido?: string;
  telefono?: string;
  areaCodes?: string[];
  permissions?: PermissionFlags;
};

let poolPromise: Promise<sql.ConnectionPool> | null = null;

function getDbConfig(): sql.config {
  return {
    server: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? '1433'),
    user: process.env.DB_USER ?? 'sa',
    password: process.env.DB_PASS ?? process.env.MSSQL_SA_PASSWORD ?? '',
    database: process.env.DB_NAME ?? 'DMS',
    options: {
      encrypt:
        String(process.env.DB_ENCRYPT ?? 'false').toLowerCase() === 'true',
      trustServerCertificate:
        String(process.env.DB_TRUST_CERT ?? 'true').toLowerCase() !== 'false',
    },
    pool: {
      max: 5,
      min: 0,
      idleTimeoutMillis: 30000,
    },
  };
}

async function getPool() {
  // Reuse single shared pool across test suite for speed and connection stability.
  if (!poolPromise) {
    const pool = new sql.ConnectionPool(getDbConfig());
    poolPromise = pool.connect();
  }
  return poolPromise;
}

async function getUserIdByEmail(email: string) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('email', sql.VarChar(255), email)
    .query('SELECT TOP 1 [id] FROM [user] WHERE [email] = @email');
  return (result.recordset[0] as { id: number } | undefined)?.id ?? null;
}

async function setAllowedAreasByUserId(userId: number, areaCodes: string[]) {
  const pool = await getPool();
  await pool
    .request()
    .input('userId', sql.Int, userId)
    .query('DELETE FROM [user_area_codes] WHERE [userId] = @userId');

  for (const areaCode of areaCodes) {
    await pool
      .request()
      .input('userId', sql.Int, userId)
      .input('code', sql.VarChar(20), areaCode.toUpperCase()).query(`
        INSERT INTO [user_area_codes] ([userId], [areaCodeId])
        SELECT @userId, [id]
        FROM [area_code]
        WHERE [code] = @code
      `);
  }
}

function normalizePermissions(permissions?: PermissionFlags) {
  // Default to least privilege except read/access unless explicitly overridden.
  return {
    canAccess: permissions?.canAccess ?? true,
    canRead: permissions?.canRead ?? true,
    canUpload: permissions?.canUpload ?? false,
    canUploadNewVersion: permissions?.canUploadNewVersion ?? false,
    canReview: permissions?.canReview ?? false,
    canApprove: permissions?.canApprove ?? false,
    canDelete: permissions?.canDelete ?? false,
  };
}

export async function ensureSuperAdminUser(email: string, password: string) {
  const pool = await getPool();
  const passwordHash = await bcrypt.hash(password, 10);

  // UPSERT idempotente: garantiza admin total para escenarios E2E sin depender de seed externo.
  await pool
    .request()
    .input('email', sql.VarChar(255), email)
    .input('passwordHash', sql.VarChar(255), passwordHash).query(`
      IF EXISTS (SELECT 1 FROM [user] WHERE [email] = @email)
      BEGIN
        UPDATE [user]
        SET [passwordHash] = @passwordHash,
            [role] = 'admin',
            [status] = 'APPROVED',
            [isSuperAdmin] = 1,
            [canAccess] = 1,
            [canRead] = 1,
            [canUpload] = 1,
            [canUploadNewVersion] = 1,
            [canReview] = 1,
            [canApprove] = 1,
            [canDelete] = 1,
            [verifiedAt] = COALESCE([verifiedAt], GETDATE()),
            [approvedAt] = COALESCE([approvedAt], GETDATE()),
            [approvedById] = NULL,
            [rejectedAt] = NULL,
            [rejectedReason] = NULL,
            [failedLoginAttempts] = 0,
            [lastFailedLoginAt] = NULL,
            [loginBlockedUntil] = NULL
        WHERE [email] = @email
      END
      ELSE
      BEGIN
        INSERT INTO [user] (
          [email], [passwordHash], [role], [status], [isSuperAdmin],
          [canAccess], [canRead], [canUpload], [canUploadNewVersion],
          [canReview], [canApprove], [canDelete], [verifiedAt], [approvedAt], [createdAt],
          [failedLoginAttempts]
        )
        VALUES (
          @email, @passwordHash, 'admin', 'APPROVED', 1,
          1, 1, 1, 1,
          1, 1, 1, GETDATE(), GETDATE(), GETDATE(),
          0
        )
      END
    `);
}

export async function ensureApprovedUser(input: ApprovedUserInput) {
  const pool = await getPool();
  const passwordHash = await bcrypt.hash(input.password, 10);
  const permissions = normalizePermissions(input.permissions);

  // UPSERT de usuario funcional con permisos parametrizables para pruebas por rol.
  await pool
    .request()
    .input('email', sql.VarChar(255), input.email)
    .input('passwordHash', sql.VarChar(255), passwordHash)
    .input('nombre', sql.VarChar(255), input.nombre)
    .input('primerApellido', sql.VarChar(255), input.primerApellido)
    .input('segundoApellido', sql.VarChar(255), input.segundoApellido ?? null)
    .input('telefono', sql.VarChar(255), input.telefono ?? null)
    .input('canAccess', sql.Bit, permissions.canAccess)
    .input('canRead', sql.Bit, permissions.canRead)
    .input('canUpload', sql.Bit, permissions.canUpload)
    .input('canUploadNewVersion', sql.Bit, permissions.canUploadNewVersion)
    .input('canReview', sql.Bit, permissions.canReview)
    .input('canApprove', sql.Bit, permissions.canApprove)
    .input('canDelete', sql.Bit, permissions.canDelete).query(`
      IF EXISTS (SELECT 1 FROM [user] WHERE [email] = @email)
      BEGIN
        UPDATE [user]
        SET [passwordHash] = @passwordHash,
            [role] = 'user',
            [nombre] = @nombre,
            [primerApellido] = @primerApellido,
            [segundoApellido] = @segundoApellido,
            [telefono] = @telefono,
            [status] = 'APPROVED',
            [isSuperAdmin] = 0,
            [canAccess] = @canAccess,
            [canRead] = @canRead,
            [canUpload] = @canUpload,
            [canUploadNewVersion] = @canUploadNewVersion,
            [canReview] = @canReview,
            [canApprove] = @canApprove,
            [canDelete] = @canDelete,
            [verifiedAt] = COALESCE([verifiedAt], GETDATE()),
            [approvedAt] = COALESCE([approvedAt], GETDATE()),
            [approvedById] = NULL,
            [rejectedAt] = NULL,
            [rejectedReason] = NULL,
            [failedLoginAttempts] = 0,
            [lastFailedLoginAt] = NULL,
            [loginBlockedUntil] = NULL
        WHERE [email] = @email
      END
      ELSE
      BEGIN
        INSERT INTO [user] (
          [email], [passwordHash], [role], [nombre], [primerApellido], [segundoApellido], [telefono],
          [status], [isSuperAdmin], [canAccess], [canRead], [canUpload], [canUploadNewVersion],
          [canReview], [canApprove], [canDelete], [verifiedAt], [approvedAt], [createdAt], [failedLoginAttempts]
        )
        VALUES (
          @email, @passwordHash, 'user', @nombre, @primerApellido, @segundoApellido, @telefono,
          'APPROVED', 0, @canAccess, @canRead, @canUpload, @canUploadNewVersion,
          @canReview, @canApprove, @canDelete, GETDATE(), GETDATE(), GETDATE(), 0
        )
      END
    `);

  const userId = await getUserIdByEmail(input.email);
  if (!userId) {
    throw new Error(`No se pudo asegurar el usuario ${input.email}`);
  }
  await setAllowedAreasByUserId(userId, input.areaCodes ?? []);
  return userId;
}

export async function setVerificationCode(email: string, code: string) {
  const userId = await getUserIdByEmail(email);
  if (!userId) {
    throw new Error(`Usuario no encontrado para OTP: ${email}`);
  }
  const pool = await getPool();
  const codeHash = await bcrypt.hash(code, 10);

  // Inserta/actualiza OTP simulado con expiracion corta para validar flujo de verificacion.
  await pool
    .request()
    .input('userId', sql.Int, userId)
    .input('codeHash', sql.VarChar(255), codeHash).query(`
      IF EXISTS (SELECT 1 FROM [email_verification] WHERE [userId] = @userId)
      BEGIN
        UPDATE [email_verification]
        SET [codeHash] = @codeHash,
            [expiresAt] = DATEADD(MINUTE, 15, GETDATE()),
            [sendStatus] = 'SIMULATED',
            [sendAttempts] = CASE WHEN [sendAttempts] < 1 THEN 1 ELSE [sendAttempts] END,
            [sentAt] = COALESCE([sentAt], GETDATE()),
            [verifyAttempts] = 0,
            [lastAttemptAt] = NULL,
            [lastAttemptIp] = NULL,
            [lastError] = NULL,
            [updatedAt] = GETDATE()
        WHERE [userId] = @userId
      END
      ELSE
      BEGIN
        INSERT INTO [email_verification] (
          [userId], [codeHash], [expiresAt], [sendStatus], [sendAttempts], [sentAt],
          [verifyAttempts], [createdAt], [updatedAt]
        )
        VALUES (
          @userId, @codeHash, DATEADD(MINUTE, 15, GETDATE()), 'SIMULATED', 1, GETDATE(),
          0, GETDATE(), GETDATE()
        )
      END
    `);
}

export async function getDocumentIdByName(name: string) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('nombre', sql.VarChar(255), name)
    .query(
      'SELECT TOP 1 [id] FROM [document] WHERE [nombre] = @nombre ORDER BY [id] DESC',
    );
  return (result.recordset[0] as { id: number } | undefined)?.id ?? null;
}

export async function waitForDocumentIdByName(name: string, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  // Poll because document creation is async relative to browser flow.
  while (Date.now() < deadline) {
    const documentId = await getDocumentIdByName(name);
    if (documentId) {
      return documentId;
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`No se encontro documento con nombre ${name}`);
}

export async function getLatestVersionIdByDocumentId(documentId: number) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('documentId', sql.Int, documentId)
    .query(
      'SELECT TOP 1 [id] FROM [version] WHERE [documentId] = @documentId ORDER BY [id] DESC',
    );
  return (result.recordset[0] as { id: number } | undefined)?.id ?? null;
}

export async function waitForDocumentStatus(
  documentId: number,
  status: string,
  timeoutMs = 15000,
) {
  const pool = await getPool();
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const result = await pool
      .request()
      .input('documentId', sql.Int, documentId)
      .input('status', sql.VarChar(50), status)
      .query(
        'SELECT TOP 1 [id] FROM [document] WHERE [id] = @documentId AND [status] = @status',
      );
    if (result.recordset.length > 0) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`El documento ${documentId} no llego al estado ${status}`);
}

export async function waitForAuditAction(params: {
  action: string;
  resourceType?: string;
  resourceId?: number;
  userId?: number;
  metaContains?: string;
  timeoutMs?: number;
}) {
  const pool = await getPool();
  const deadline = Date.now() + (params.timeoutMs ?? 15000);

  // Poll audit table to assert side effects triggered by API actions.
  while (Date.now() < deadline) {
    const request = pool
      .request()
      .input('action', sql.VarChar(100), params.action);
    let query = 'SELECT TOP 1 [id] FROM [audit_log] WHERE [action] = @action';

    if (params.resourceType) {
      request.input('resourceType', sql.VarChar(100), params.resourceType);
      query += ' AND [resourceType] = @resourceType';
    }
    if (typeof params.resourceId === 'number') {
      request.input('resourceId', sql.Int, params.resourceId);
      query += ' AND [resourceId] = @resourceId';
    }
    if (typeof params.userId === 'number') {
      request.input('userId', sql.Int, params.userId);
      query += ' AND [userId] = @userId';
    }
    if (params.metaContains) {
      request.input(
        'metaContains',
        sql.VarChar(sql.MAX),
        `%${params.metaContains}%`,
      );
      query += ' AND [meta] LIKE @metaContains';
    }

    query += ' ORDER BY [id] DESC';
    const result = await request.query(query);
    if (result.recordset.length > 0) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  throw new Error(
    `No se encontro auditoria action=${params.action} resourceType=${params.resourceType ?? '-'} resourceId=${params.resourceId ?? '-'} metaContains=${params.metaContains ?? '-'}`,
  );
}

export async function deleteDocumentsByNamePrefix(prefix: string) {
  const pool = await getPool();
  await pool.request().input('prefix', sql.VarChar(255), `${prefix}%`).query(`
      DELETE FROM [search_index_job]
      WHERE [documentId] IN (SELECT [id] FROM [document] WHERE [nombre] LIKE @prefix);

      DELETE FROM [document_approval]
      WHERE [documentId] IN (SELECT [id] FROM [document] WHERE [nombre] LIKE @prefix);

      DELETE FROM [version]
      WHERE [documentId] IN (SELECT [id] FROM [document] WHERE [nombre] LIKE @prefix);

      DELETE FROM [document]
      WHERE [nombre] LIKE @prefix;
    `);
}

export async function deleteUsersByEmails(emails: string[]) {
  const uniqueEmails = Array.from(new Set(emails.filter(Boolean)));
  if (uniqueEmails.length === 0) {
    return;
  }

  const pool = await getPool();
  for (const email of uniqueEmails) {
    await pool.request().input('email', sql.VarChar(255), email).query(`
        DELETE FROM [permission_request]
        WHERE [userId] IN (SELECT [id] FROM [user] WHERE [email] = @email);

        DELETE FROM [email_verification]
        WHERE [userId] IN (SELECT [id] FROM [user] WHERE [email] = @email);

        DELETE FROM [user_area_codes]
        WHERE [userId] IN (SELECT [id] FROM [user] WHERE [email] = @email);

        DELETE FROM [user]
        WHERE [email] = @email;
      `);
  }
}

export async function closeDb() {
  if (!poolPromise) {
    return;
  }
  const pool = await poolPromise;
  await pool.close();
  poolPromise = null;
}
