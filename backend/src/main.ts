import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { AppModule } from './app.module';
import { AppExceptionFilter } from './common/filters/app-exception.filter';
import { getEnv, getEnvNumber } from './common/env.utils';
import { requestIdMiddleware } from './common/middleware/request-id.middleware';
import { RequestLoggingInterceptor } from './common/interceptors/request-logging.interceptor';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { writeAppLog } from './common/logging.utils';
import { createValidationException } from './common/http-error.utils';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const nodeEnv = getEnv('NODE_ENV', 'development');
  const corsOrigin = getEnv('CORS_ORIGIN', '*') ?? '*';
  const corsOrigins =
    corsOrigin === '*'
      ? true
      : corsOrigin.split(',').map((value) => value.trim());
  app.enableCors({ origin: corsOrigins });
  app.use(
    helmet({
      // CSP is env-driven so deployment can tighten or relax directives per environment.
      contentSecurityPolicy:
        getEnv('CSP_ENABLED', 'true') !== 'false'
          ? {
              useDefaults: true,
              directives: {
                defaultSrc: parseCspDirective('CSP_DEFAULT_SRC', ["'self'"]),
                connectSrc: parseCspDirective('CSP_CONNECT_SRC', [
                  "'self'",
                  ...getCorsOriginsForCsp(corsOrigins),
                ]),
                imgSrc: parseCspDirective('CSP_IMG_SRC', [
                  "'self'",
                  'data:',
                  'blob:',
                ]),
                styleSrc: parseCspDirective('CSP_STYLE_SRC', [
                  "'self'",
                  "'unsafe-inline'",
                ]),
                fontSrc: parseCspDirective('CSP_FONT_SRC', ["'self'", 'data:']),
                scriptSrc: parseCspDirective('CSP_SCRIPT_SRC', ["'self'"]),
              },
            }
          : false,
      hsts:
        nodeEnv === 'production'
          ? {
              maxAge: 31536000,
              includeSubDomains: true,
              preload: true,
            }
          : false,
      referrerPolicy: { policy: 'no-referrer' },
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(requestIdMiddleware);
  app.useGlobalPipes(
    new ValidationPipe({
      // This enforces DTO contracts and normalizes validation errors into app format.
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      exceptionFactory: createValidationException,
    }),
  );
  app.useGlobalFilters(new AppExceptionFilter());
  app.useGlobalInterceptors(app.get(RequestLoggingInterceptor));

  const uploadDir = getEnv('UPLOAD_DIR') ?? join(process.cwd(), 'uploads');
  const maxFileSizeMb = getEnvNumber('MAX_FILE_SIZE_MB', 20);
  if (maxFileSizeMb <= 0) {
    writeAppLog({
      level: 'warn',
      event: 'env_warning',
      message:
        'MAX_FILE_SIZE_MB debe ser mayor a 0. Se usara el valor por defecto.',
    });
  }

  const uploadsDir = uploadDir;
  if (!existsSync(uploadsDir)) {
    mkdirSync(uploadsDir, { recursive: true });
  }

  if (nodeEnv === 'development') {
    // Swagger is intentionally exposed only in development.
    const config = new DocumentBuilder()
      .setTitle('DMS API')
      .setDescription('Document Management System API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
  }

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();

function parseCspDirective(envKey: string, fallback: string[]) {
  const configured = getEnv(envKey);
  if (!configured) {
    return fallback;
  }
  const values = configured
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  return values.length > 0 ? values : fallback;
}

function getCorsOriginsForCsp(corsOrigins: true | string[]) {
  if (corsOrigins === true) {
    return [];
  }
  return corsOrigins.map((origin) => origin.trim()).filter(Boolean);
}
