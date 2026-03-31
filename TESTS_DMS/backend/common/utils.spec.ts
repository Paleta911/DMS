import 'reflect-metadata'
import fs from 'fs'
import os from 'os'
import path from 'path'

describe('Common utilities external tests', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('reads environment values with fallbacks and casting', async () => {
    const { getEnv, getEnvBool, getEnvNumber } = require('../../../backend/src/common/env.utils')

    process.env.TEST_STRING = 'value'
    process.env.TEST_EMPTY = ''
    process.env.TEST_NUMBER = '42'
    process.env.TEST_NUMBER_INVALID = 'abc'
    process.env.TEST_BOOL_TRUE = 'TRUE'
    process.env.TEST_BOOL_FALSE = 'false'

    expect(getEnv('TEST_STRING', 'fallback')).toBe('value')
    expect(getEnv('TEST_EMPTY', 'fallback')).toBe('fallback')
    expect(getEnv('MISSING_VALUE', 'fallback')).toBe('fallback')

    expect(getEnvNumber('TEST_NUMBER', 7)).toBe(42)
    expect(getEnvNumber('TEST_NUMBER_INVALID', 7)).toBe(7)
    expect(getEnvNumber('MISSING_NUMBER', 7)).toBe(7)

    expect(getEnvBool('TEST_BOOL_TRUE', false)).toBe(true)
    expect(getEnvBool('TEST_BOOL_FALSE', true)).toBe(false)
    expect(getEnvBool('MISSING_BOOL', true)).toBe(true)
  })

  it('stores and reads request context', async () => {
    const { getRequestId, runWithRequestContext } = require('../../../backend/src/common/request-context')

    expect(getRequestId()).toBeUndefined()

    const result = runWithRequestContext({ requestId: 'req-123' }, () => ({
      requestId: getRequestId(),
    }))

    expect(result).toEqual({ requestId: 'req-123' })
    expect(getRequestId()).toBeUndefined()
  })

  it('writes pretty logs to console and file', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dms-log-'))
    const logPath = path.join(tempDir, 'app.log')
    process.env.LOG_FORMAT = 'pretty'
    process.env.LOG_FILE_PATH = logPath

    const consoleInfo = jest.spyOn(console, 'log').mockImplementation(() => undefined)
    const consoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => undefined)
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined)

    const { runWithRequestContext } = require('../../../backend/src/common/request-context')
    const { writeAppLog } = require('../../../backend/src/common/logging.utils')

    runWithRequestContext({ requestId: 'req-log' }, () => {
      writeAppLog({
        level: 'warn',
        event: 'sample_event',
        message: 'mensaje',
        data: { value: 7, note: 'hola mundo' },
      })
    })
    writeAppLog({ level: 'error', event: 'error_event', data: { ok: false } })

    expect(consoleWarn).toHaveBeenCalledWith(
      expect.stringContaining('[sample_event] mensaje requestId=req-log value=7 note=\"hola mundo\"'),
    )
    expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('[error_event] ok=false'))
    expect(consoleInfo).not.toHaveBeenCalled()

    const persisted = fs.readFileSync(logPath, 'utf8')
    expect(persisted).toContain('[sample_event] mensaje requestId=req-log value=7 note=\"hola mundo\"')
    expect(persisted).toContain('[error_event] ok=false')

    consoleInfo.mockRestore()
    consoleWarn.mockRestore()
    consoleError.mockRestore()
  })

  it('writes JSON logs when LOG_FORMAT=json', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dms-log-json-'))
    const logPath = path.join(tempDir, 'app.log')
    process.env.LOG_FORMAT = 'json'
    process.env.LOG_FILE_PATH = logPath

    const consoleInfo = jest.spyOn(console, 'log').mockImplementation(() => undefined)
    const { writeAppLog } = require('../../../backend/src/common/logging.utils')

    writeAppLog({ event: 'json_event', data: { count: 2 } })

    const payload = consoleInfo.mock.calls[0]?.[0]
    expect(typeof payload).toBe('string')
    expect(JSON.parse(payload)).toMatchObject({
      event: 'json_event',
      level: 'info',
      count: 2,
    })

    const persisted = fs.readFileSync(logPath, 'utf8').trim()
    expect(JSON.parse(persisted)).toMatchObject({
      event: 'json_event',
      count: 2,
    })

    consoleInfo.mockRestore()
  })

  it('exposes password policy constants and decorators metadata', async () => {
    const { PASSWORD_MIN_LENGTH, PASSWORD_POLICY_MESSAGE, PASSWORD_POLICY_REGEX } = require('../../../backend/src/auth/password-policy')
    const { Permissions, PERMISSIONS_KEY } = require('../../../backend/src/auth/permissions.decorator')
    const { Roles, ROLES_KEY } = require('../../../backend/src/auth/roles.decorator')
    const { PermissionKey } = require('../../../backend/src/users/permissions')
    const { UserRole } = require('../../../backend/src/users/user-role.enum')

    expect(PASSWORD_MIN_LENGTH).toBe(8)
    expect(PASSWORD_POLICY_MESSAGE).toMatch(/8 caracteres/i)
    expect(PASSWORD_POLICY_REGEX.test('Password1')).toBe(true)
    expect(PASSWORD_POLICY_REGEX.test('password1')).toBe(false)
    expect(PASSWORD_POLICY_REGEX.test('PASSWORD1')).toBe(false)
    expect(PASSWORD_POLICY_REGEX.test('Password')).toBe(false)

    class SampleController {
      @Permissions(PermissionKey.Read, PermissionKey.Upload)
      permissionsMethod() {}

      @Roles(UserRole.Admin)
      rolesMethod() {}
    }

    expect(Reflect.getMetadata(PERMISSIONS_KEY, SampleController.prototype.permissionsMethod)).toEqual([
      PermissionKey.Read,
      PermissionKey.Upload,
    ])
    expect(Reflect.getMetadata(ROLES_KEY, SampleController.prototype.rolesMethod)).toEqual([
      UserRole.Admin,
    ])
  })

  it('builds the typeorm data source with expected defaults', async () => {
    process.env.DB_HOST = 'sql.local'
    process.env.DB_PORT = '1444'
    process.env.DB_USER = 'tester'
    process.env.DB_PASS = 'secret'
    process.env.DB_NAME = 'DMS_TEST'
    process.env.DB_ENCRYPT = 'true'
    process.env.DB_TRUST_CERT = 'false'

    const { AppDataSource } = require('../../../backend/src/data-source')

    expect(AppDataSource.options).toMatchObject({
      type: 'mssql',
      host: 'sql.local',
      port: 1444,
      username: 'tester',
      password: 'secret',
      database: 'DMS_TEST',
      synchronize: false,
      migrationsRun: false,
    })
    expect((AppDataSource.options as any).options).toEqual({
      encrypt: true,
      trustServerCertificate: false,
    })
  })
})
