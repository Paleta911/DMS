import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { getEnv, getEnvBool, getEnvNumber } from './common/env.utils';

dotenv.config();

// DataSource usado por TypeORM CLI y procesos de migracion fuera del runtime Nest.
export const AppDataSource = new DataSource({
  type: 'mssql',
  host: getEnv('DB_HOST', 'localhost'),
  port: getEnvNumber('DB_PORT', 1433),
  username: getEnv('DB_USER', 'sa'),
  password: getEnv('DB_PASS', getEnv('MSSQL_SA_PASSWORD', '')),
  database: getEnv('DB_NAME', 'DMS'),
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  migrationsRun: false,
  synchronize: false,
  options: {
    // Flags TLS configurables para entornos locales/servidor SQL administrado.
    encrypt: getEnvBool('DB_ENCRYPT', false),
    trustServerCertificate: getEnvBool('DB_TRUST_CERT', true),
  },
});
