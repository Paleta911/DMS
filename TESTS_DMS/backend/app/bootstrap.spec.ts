describe('Application bootstrap external tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  async function importMainWith(options?: {
    nodeEnv?: string;
    corsOrigin?: string;
    uploadDir?: string;
    maxFileSizeMb?: number;
    uploadExists?: boolean;
  }) {
    const app = {
      enableCors: jest.fn(),
      use: jest.fn(),
      useGlobalPipes: jest.fn(),
      useGlobalFilters: jest.fn(),
      useGlobalInterceptors: jest.fn(),
      get: jest.fn().mockReturnValue('interceptor'),
      listen: jest.fn().mockResolvedValue(undefined),
    };
    const createDocument = jest.fn().mockReturnValue({ openapi: 'doc' });
    const setup = jest.fn();
    const mkdirSync = jest.fn();
    const existsSync = jest.fn().mockReturnValue(options?.uploadExists ?? false);
    const helmetFactory = jest.fn().mockReturnValue('helmet-mw');
    const writeAppLog = jest.fn();

    jest.doMock('../../../backend/src/app.module', () => ({ AppModule: class AppModule {} }));
    jest.doMock('../../../backend/src/common/interceptors/request-logging.interceptor', () => ({
      RequestLoggingInterceptor: class RequestLoggingInterceptor {},
    }));
    jest.doMock('../../../backend/src/common/filters/app-exception.filter', () => ({
      AppExceptionFilter: class AppExceptionFilter {},
    }));
    jest.doMock('../../../backend/src/common/http-error.utils', () => ({
      createValidationException: jest.fn().mockReturnValue(new Error('validation')),
    }));
    jest.doMock('../../../backend/src/common/middleware/request-id.middleware', () => ({
      requestIdMiddleware: jest.fn(),
    }));
    jest.doMock('../../../backend/src/common/logging.utils', () => ({
      writeAppLog,
    }));
    jest.doMock('../../../backend/src/common/env.utils', () => ({
      getEnv: (key: string, fallback?: string) => {
        const values: Record<string, string | undefined> = {
          NODE_ENV: options?.nodeEnv ?? 'development',
          CORS_ORIGIN: options?.corsOrigin ?? '*',
          UPLOAD_DIR: options?.uploadDir ?? 'C:/tmp/uploads',
          CSP_ENABLED: 'true',
        };
        return values[key] ?? fallback;
      },
      getEnvNumber: () => options?.maxFileSizeMb ?? 20,
    }));
    jest.doMock('@nestjs/core', () => ({
      NestFactory: {
        create: jest.fn().mockResolvedValue(app),
      },
    }));
    jest.doMock('@nestjs/swagger', () => ({
      DocumentBuilder: class DocumentBuilder {
        setTitle() { return this; }
        setDescription() { return this; }
        setVersion() { return this; }
        addBearerAuth() { return this; }
        build() { return { built: true }; }
      },
      SwaggerModule: {
        createDocument,
        setup,
      },
    }));
    jest.doMock('helmet', () => ({
      __esModule: true,
      default: helmetFactory,
    }));
    jest.doMock('fs', () => ({
      existsSync,
      mkdirSync,
    }));

    require('../../../backend/src/main');
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));

    return { app, createDocument, setup, mkdirSync, existsSync, helmetFactory, writeAppLog };
  }

  it('bootstraps in development with swagger and wildcard cors', async () => {
    process.env.PORT = '3456';
    const { app, createDocument, setup, mkdirSync, helmetFactory } = await importMainWith({
      nodeEnv: 'development',
      corsOrigin: '*',
      uploadExists: false,
    });

    expect(app.enableCors).toHaveBeenCalledWith({ origin: true });
    expect(helmetFactory).toHaveBeenCalledWith(expect.objectContaining({
      hsts: false,
      contentSecurityPolicy: expect.objectContaining({
        directives: expect.objectContaining({
          defaultSrc: ["'self'"],
        }),
      }),
    }));
    expect(app.useGlobalPipes).toHaveBeenCalledTimes(1);
    expect(app.useGlobalFilters).toHaveBeenCalledTimes(1);
    expect(app.useGlobalInterceptors).toHaveBeenCalledWith('interceptor');
    expect(mkdirSync).toHaveBeenCalledWith('C:/tmp/uploads', { recursive: true });
    expect(createDocument).toHaveBeenCalledTimes(1);
    expect(setup).toHaveBeenCalledWith('docs', app, { openapi: 'doc' });
    expect(app.listen).toHaveBeenCalledWith('3456');
  });

  it('bootstraps in production with explicit cors, no swagger and logs invalid file size warning', async () => {
    process.env.PORT = '3001';
    const { app, createDocument, setup, writeAppLog, existsSync } = await importMainWith({
      nodeEnv: 'production',
      corsOrigin: 'https://a.com, https://b.com',
      uploadExists: true,
      maxFileSizeMb: 0,
    });

    expect(app.enableCors).toHaveBeenCalledWith({ origin: ['https://a.com', 'https://b.com'] });
    expect(createDocument).not.toHaveBeenCalled();
    expect(setup).not.toHaveBeenCalled();
    expect(existsSync).toHaveBeenCalledWith('C:/tmp/uploads');
    expect(writeAppLog).toHaveBeenCalledWith(expect.objectContaining({
      level: 'warn',
      event: 'env_warning',
    }));
    expect(app.listen).toHaveBeenCalledWith('3001');
  });
});

describe('Worker bootstrap external tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  it('starts worker, registers signal handlers and shuts down cleanly', async () => {
    const app = { close: jest.fn().mockResolvedValue(undefined) };
    const writeAppLog = jest.fn();
    const handlers = new Map<string, () => void>();
    const onceSpy = jest.spyOn(process, 'once').mockImplementation(((signal: any, handler: any) => {
      handlers.set(signal, handler);
      return process;
    }) as any);
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as any);

    jest.doMock('../../../backend/src/app.module', () => ({ AppModule: class AppModule {} }));
    jest.doMock('../../../backend/src/common/logging.utils', () => ({ writeAppLog }));
    jest.doMock('@nestjs/core', () => ({
      NestFactory: {
        createApplicationContext: jest.fn().mockResolvedValue(app),
      },
    }));

    require('../../../backend/src/worker');
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));

    expect(process.env.APP_RUNTIME_ROLE).toBe('worker');
    expect(writeAppLog).toHaveBeenCalledWith(expect.objectContaining({
      event: 'worker_started',
    }));
    expect(onceSpy).toHaveBeenCalledWith('SIGINT', expect.any(Function));
    expect(onceSpy).toHaveBeenCalledWith('SIGTERM', expect.any(Function));

    handlers.get('SIGTERM')?.();
    await new Promise((resolve) => setImmediate(resolve));

    expect(writeAppLog).toHaveBeenCalledWith(expect.objectContaining({
      event: 'worker_stopping',
      data: expect.objectContaining({ signal: 'SIGTERM' }),
    }));
    expect(app.close).toHaveBeenCalledTimes(1);
    expect(exitSpy).toHaveBeenCalledWith(0);
  });
});
