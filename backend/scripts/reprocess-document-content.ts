import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DocumentsService } from '../src/documents/documents.service';

// CLI options for selective content reprocessing (single document or full run with force).
type CliOptions = {
  documentId?: number;
  force?: boolean;
};

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {};
  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (current === '--force') {
      options.force = true;
      continue;
    }
    if (current === '--document-id') {
      const next = Number(argv[index + 1]);
      if (!Number.isNaN(next) && next > 0) {
        options.documentId = next;
        index += 1;
      }
    }
  }
  return options;
}

async function main() {
  // Create DI context without HTTP server to execute service logic from CLI.
  const options = parseArgs(process.argv.slice(2));
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'warn', 'error'],
  });

  try {
    const documentsService = app.get(DocumentsService);
    // Recompute OCR/indexable content using same business rules as runtime pipeline.
    const result = await documentsService.reprocessContent(options);
    console.log('[documents:reprocess-content] done', JSON.stringify(result));
  } finally {
    await app.close();
  }
}

void main().catch((error) => {
  console.error(
    '[documents:reprocess-content] failed',
    error instanceof Error ? error.message : String(error),
  );
  process.exit(1);
});
