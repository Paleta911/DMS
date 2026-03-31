import { assertSecurityConfig } from './security-config.utils';

describe('assertSecurityConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'ProdValidationSecret_123456789';
    process.env.JWT_REFRESH_SECRET = 'ProdValidationRefresh_123456789';
    process.env.BOOTSTRAP_TOKEN = 'ProdBootstrapToken_123456789';
    process.env.AUTH_LOGIN_BLOCK_AFTER = '5';
    process.env.AUTH_LOGIN_BLOCK_SEC = '900';
    process.env.CORS_ORIGIN = 'https://dms.example.com';
    process.env.EMAIL_MODE = 'smtp';
    process.env.SMTP_HOST = 'smtp.example.com';
    process.env.SMTP_FROM = 'dms@example.com';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('acepta configuracion smtp valida en produccion', () => {
    expect(() => assertSecurityConfig()).not.toThrow();
  });

  it('rechaza EMAIL_MODE distinto de smtp en produccion', () => {
    process.env.EMAIL_MODE = 'console';
    expect(() => assertSecurityConfig()).toThrow(
      'EMAIL_MODE debe ser smtp en produccion',
    );
  });

  it('rechaza smtp incompleto en produccion', () => {
    delete process.env.SMTP_HOST;
    expect(() => assertSecurityConfig()).toThrow(
      'SMTP_HOST y SMTP_FROM son obligatorios cuando EMAIL_MODE=smtp',
    );
  });
});
