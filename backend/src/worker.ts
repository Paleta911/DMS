import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { writeAppLog } from './common/logging.utils';

async function bootstrapWorker() {
  process.env.APP_RUNTIME_ROLE = process.env.APP_RUNTIME_ROLE ?? 'worker';

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'warn', 'error'],
  });

  writeAppLog({
    level: 'info',
    event: 'worker_started',
    message: 'Proceso worker iniciado',
    data: {
      runtimeRole: process.env.APP_RUNTIME_ROLE,
      pid: process.pid,
    },
  });

  const shutdown = async (signal: string) => {
    writeAppLog({
      level: 'info',
      event: 'worker_stopping',
      message: 'Cerrando proceso worker',
      data: { signal, pid: process.pid },
    });
    await app.close();
    process.exit(0);
  };

  process.once('SIGINT', () => {
    void shutdown('SIGINT');
  });
  process.once('SIGTERM', () => {
    void shutdown('SIGTERM');
  });

  await new Promise<void>(() => undefined);
}

void bootstrapWorker();
