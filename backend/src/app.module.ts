// eslint-disable @typescript-eslint/no-unsafe-call */
// eslint-disable @typescript-eslint/no-unsafe-member-access */

// src/app.module.ts

import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import * as Joi from 'joi';
import { DocumentsModule } from './documents/documents.module';
import { VersionsModule } from './versions/versions.module';
import { CategoriesModule } from './categories/categories.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { getEnv, getEnvBool, getEnvNumber } from './common/env.utils';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DocumentTypesModule } from './document-types/document-types.module';
import { AreaCodesModule } from './area-codes/area-codes.module';
import { SearchModule } from './search/search.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { PermissionsModule } from './permissions/permissions.module';
import { AdminModule } from './admin/admin.module';
import { ObservabilityModule } from './observability/observability.module';
import { PlatformModule } from './platform/platform.module';
import { DocumentVisibilityModule } from './document-visibility/document-visibility.module';
import { writeAppLog } from './common/logging.utils';
import { assertSecurityConfig } from './common/security-config.utils';

const envValidationSchema = Joi.object({
  // Validation here centralizes runtime guarantees before Nest bootstraps modules.
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  DB_HOST: Joi.string().default('localhost'),
  DB_PORT: Joi.number().port().default(1433),
  DB_USER: Joi.string().default('sa'),
  DB_PASS: Joi.string().allow('').optional(),
  MSSQL_SA_PASSWORD: Joi.string().allow('').optional(),
  DB_NAME: Joi.string().default('DMS'),
  DB_ENCRYPT: Joi.boolean()
    .truthy('true', '1')
    .falsy('false', '0')
    .default(false),
  DB_TRUST_CERT: Joi.boolean()
    .truthy('true', '1')
    .falsy('false', '0')
    .default(true),
  DB_SYNC: Joi.boolean().truthy('true', '1').falsy('false', '0').default(false),
  JWT_SECRET: Joi.string().min(8).required(),
  JWT_EXPIRES_IN: Joi.string().default('1d'),
  JWT_ACCESS_EXPIRES_IN_SEC: Joi.number().integer().min(60).default(86400),
  JWT_REFRESH_SECRET: Joi.string().allow('').optional(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
  THROTTLE_TTL: Joi.number().integer().min(1).default(60),
  THROTTLE_LIMIT: Joi.number().integer().min(1).default(100),
  AUTH_LOGIN_LIMIT: Joi.number().integer().min(1).default(10),
  AUTH_LOGIN_TTL_SEC: Joi.number().integer().min(1).default(60),
  AUTH_LOGIN_BLOCK_AFTER: Joi.number().integer().min(3).default(5),
  AUTH_LOGIN_BLOCK_SEC: Joi.number().integer().min(60).default(300),
  AUTH_LOGIN_RESET_WINDOW_SEC: Joi.number().integer().min(60).default(3600),
  AUTH_REGISTER_LIMIT: Joi.number().integer().min(1).default(6),
  AUTH_REGISTER_TTL_SEC: Joi.number().integer().min(1).default(300),
  AUTH_VERIFY_EMAIL_LIMIT: Joi.number().integer().min(1).default(10),
  AUTH_VERIFY_EMAIL_TTL_SEC: Joi.number().integer().min(1).default(900),
  AUTH_REFRESH_LIMIT: Joi.number().integer().min(1).default(20),
  AUTH_REFRESH_TTL_SEC: Joi.number().integer().min(1).default(300),
  AUTH_BOOTSTRAP_LIMIT: Joi.number().integer().min(1).default(3),
  AUTH_BOOTSTRAP_TTL_SEC: Joi.number().integer().min(1).default(300),
  DOCUMENT_UPLOAD_LIMIT: Joi.number().integer().min(1).default(12),
  DOCUMENT_UPLOAD_TTL_SEC: Joi.number().integer().min(1).default(60),
  PERMISSION_REQUEST_LIMIT: Joi.number().integer().min(1).default(8),
  PERMISSION_REQUEST_TTL_SEC: Joi.number().integer().min(1).default(300),
  AREA_REQUEST_LIMIT: Joi.number().integer().min(1).default(8),
  AREA_REQUEST_TTL_SEC: Joi.number().integer().min(1).default(300),
  ADMIN_REGISTRATION_ACTION_LIMIT: Joi.number().integer().min(1).default(30),
  ADMIN_REGISTRATION_ACTION_TTL_SEC: Joi.number().integer().min(1).default(60),
  ADMIN_PERMISSION_ACTION_LIMIT: Joi.number().integer().min(1).default(40),
  ADMIN_PERMISSION_ACTION_TTL_SEC: Joi.number().integer().min(1).default(60),
  SEARCH_REINDEX_LIMIT: Joi.number().integer().min(1).default(5),
  SEARCH_REINDEX_TTL_SEC: Joi.number().integer().min(1).default(60),
  UPLOAD_DIR: Joi.string().default('./uploads'),
  BACKUP_DIR: Joi.string().default('./backups'),
  MAX_FILE_SIZE_MB: Joi.number().integer().min(1).default(20),
  UPLOAD_ORIGINAL_NAME_MAX_LENGTH: Joi.number().integer().min(20).default(180),
  ALLOWED_EXTENSIONS: Joi.string().allow('').optional(),
  ALLOWED_MIME_TYPES: Joi.string().allow('').optional(),
  CORS_ORIGIN: Joi.string().default('*'),
  LOG_FORMAT: Joi.string().valid('pretty', 'json').default('pretty'),
  LOG_FILE_PATH: Joi.string().allow('').optional(),
  HTTP_SLOW_REQUEST_MS: Joi.number().integer().min(100).default(1000),
  APP_RUNTIME_ROLE: Joi.string()
    .valid('both', 'web', 'worker', 'disabled')
    .default('both'),
  FEATURE_FLAGS: Joi.string().default(
    'audit-json-export,admin-analytics,notifications,saved-views,advanced-exports,dark-mode,i18n',
  ),
  CSP_ENABLED: Joi.boolean()
    .truthy('true', '1')
    .falsy('false', '0')
    .default(true),
  CSP_DEFAULT_SRC: Joi.string().allow('').optional(),
  CSP_CONNECT_SRC: Joi.string().allow('').optional(),
  CSP_IMG_SRC: Joi.string().allow('').optional(),
  CSP_STYLE_SRC: Joi.string().allow('').optional(),
  CSP_FONT_SRC: Joi.string().allow('').optional(),
  CSP_SCRIPT_SRC: Joi.string().allow('').optional(),
  ES_NODE: Joi.string().uri().default('http://localhost:9200'),
  ES_INDEX_DOCUMENTS: Joi.string().default('dms_documents'),
  SEARCH_MODE: Joi.string()
    .valid('auto', 'elastic', 'fallback')
    .default('auto'),
  SEARCH_INDEX_MAX_RETRIES: Joi.number().integer().min(1).default(5),
  SEARCH_INDEX_RETRY_BASE_MS: Joi.number().integer().min(200).default(2000),
  SEARCH_INDEX_RETRY_MAX_MS: Joi.number().integer().min(200).default(30000),
  SEARCH_INDEX_WORKER_MS: Joi.number().integer().min(500).default(3000),
  SEARCH_INDEX_BATCH_SIZE: Joi.number().integer().min(1).default(10),
  OCR_ENABLED: Joi.boolean()
    .truthy('true', '1')
    .falsy('false', '0')
    .default(true),
  OCR_TESSERACT_BIN: Joi.string().default('tesseract'),
  OCR_PDFTOPPM_BIN: Joi.string().default('pdftoppm'),
  OCR_LANGS: Joi.string().default('spa+eng'),
  OCR_DPI: Joi.number().integer().min(72).max(600).default(300),
  OCR_MAX_PAGES: Joi.number().integer().min(1).max(100).default(10),
  OCR_TIMEOUT_MS: Joi.number().integer().min(1000).default(120000),
  BOOTSTRAP_TOKEN: Joi.string().allow('').optional(),
  ALLOWED_EMAIL_DOMAIN: Joi.string().default('bsm.com.mx'),
  EMAIL_MODE: Joi.string().valid('console', 'smtp').default('console'),
  VERIFICATION_CODE_TTL_MIN: Joi.number().integer().min(1).default(15),
  VERIFICATION_MAX_ATTEMPTS: Joi.number().integer().min(1).default(5),
  SMTP_HOST: Joi.string().allow('').optional(),
  SMTP_PORT: Joi.number().integer().min(1).max(65535).default(587),
  SMTP_USER: Joi.string().allow('').optional(),
  SMTP_PASS: Joi.string().allow('').optional(),
  SMTP_FROM: Joi.string().allow('').optional(),
}).unknown(true);

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: envValidationSchema,
    }),
    ThrottlerModule.forRoot({
      errorMessage: (_context, detail) => {
        const retryAfterMs = detail.isBlocked
          ? detail.timeToBlockExpire
          : detail.timeToExpire;
        const retryAfterSec = Math.max(1, Math.ceil(retryAfterMs / 1000));
        return `Demasiadas solicitudes. Intenta de nuevo en ${retryAfterSec}s.`;
      },
      throttlers: [
        {
          ttl: getEnvNumber('THROTTLE_TTL', 60) * 1000,
          limit: getEnvNumber('THROTTLE_LIMIT', 100),
        },
      ],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: () => {
        // Production security checks fail fast to avoid starting with unsafe defaults.
        assertSecurityConfig();
        const nodeEnv = process.env.NODE_ENV ?? 'development';
        const requiredDbVars = [
          'DB_HOST',
          'DB_PORT',
          'DB_USER',
          'DB_PASS',
          'DB_NAME',
        ];
        if (nodeEnv === 'production') {
          for (const key of requiredDbVars) {
            if (!process.env[key]) {
              writeAppLog({
                level: 'warn',
                event: 'env_warning',
                message: `Falta ${key} en produccion`,
              });
            }
          }
          if (!process.env.JWT_SECRET) {
            writeAppLog({
              level: 'error',
              event: 'env_error',
              message: 'Falta JWT_SECRET en produccion',
            });
            throw new Error('JWT_SECRET is required in production');
          }
          if (!process.env.DB_PASS) {
            writeAppLog({
              level: 'error',
              event: 'env_error',
              message: 'Falta DB_PASS en produccion',
            });
            throw new Error('DB_PASS is required in production');
          }
        }

        const dbPass = getEnv('DB_PASS');
        const dbPassword = dbPass ?? getEnv('MSSQL_SA_PASSWORD', '');
        const syncEnabled =
          nodeEnv === 'development' && getEnvBool('DB_SYNC', false);

        if (syncEnabled) {
          writeAppLog({
            level: 'warn',
            event: 'db_sync_enabled',
            message:
              'synchronize esta habilitado. Solo debe usarse en desarrollo.',
          });
        }

        return {
          // Keep migrations authoritative; synchronize is intentionally disabled by default.
          type: 'mssql' as const,
          host: getEnv('DB_HOST', 'localhost'),
          port: getEnvNumber('DB_PORT', 1433),
          username: getEnv('DB_USER', 'sa'),
          password: dbPassword,
          database: getEnv('DB_NAME', 'DMS'),
          autoLoadEntities: true,
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          migrations: [__dirname + '/migrations/*{.ts,.js}'],
          migrationsRun: false,
          synchronize: syncEnabled,
          options: {
            encrypt: getEnvBool('DB_ENCRYPT', false),
            trustServerCertificate: getEnvBool('DB_TRUST_CERT', true),
            connectTimeout: 5000,
            requestTimeout: 5000,
          },
        };
      },
    }),
    DocumentsModule,
    VersionsModule,
    CategoriesModule,
    UsersModule,
    AuthModule,
    DocumentTypesModule,
    AreaCodesModule,
    SearchModule,
    DocumentVisibilityModule,
    AuditLogModule,
    ObservabilityModule,
    PermissionsModule,
    AdminModule,
    PlatformModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
