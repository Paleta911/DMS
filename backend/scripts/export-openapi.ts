import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';

async function run() {
  const outputArg = process.argv[2];
  const outputPath = outputArg?.trim().length
    ? outputArg
    : join(process.cwd(), 'tmp', 'openapi.json');

  const app = await NestFactory.create(AppModule, { logger: false });

  try {
    // Reuse runtime module graph so exported contract matches real app wiring.
    const config = new DocumentBuilder()
      .setTitle('DMS API')
      .setDescription('Document Management System API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, `${JSON.stringify(document, null, 2)}\n`, 'utf8');
    console.log(`[openapi] exportado: ${outputPath}`);
  } finally {
    // Ensure Nest context is always closed in script mode.
    await app.close();
  }
}

run().catch((error) => {
  console.error('[openapi] fallo al exportar contrato:', error);
  process.exit(1);
});
