import 'reflect-metadata';
import { AppDataSource } from '../src/data-source';
import { runSeed } from './seed';

async function resetDev() {
  if (process.env.NODE_ENV !== 'development') {
    throw new Error('db:reset:dev only allowed when NODE_ENV=development');
  }
  await AppDataSource.initialize();
  await AppDataSource.dropDatabase();
  await AppDataSource.runMigrations();
  await AppDataSource.destroy();
  await runSeed();
}

if (require.main === module) {
  resetDev()
    .then(() => console.log('[db-reset] completed'))
    .catch((error) => {
      console.error('[db-reset] failed:', error.message);
      process.exit(1);
    });
}
