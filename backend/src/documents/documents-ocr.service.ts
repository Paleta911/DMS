import { Injectable } from '@nestjs/common';
import { execFile } from 'node:child_process';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { promisify } from 'node:util';
import { getEnv, getEnvBool, getEnvNumber } from '../common/env.utils';
import { writeAppLog } from '../common/logging.utils';
import type { DocumentTextExtractionResult } from './document-text-extraction.types';
import { VersionTextSource } from '../versions/version-text-source.enum';

const execFileAsync = promisify(execFile);

function normalizeExtractedText(value: string | null | undefined) {
  const normalized = (value ?? '').replace(/\s+/g, ' ').trim();
  return normalized.length > 0 ? normalized : null;
}

@Injectable()
export class DocumentsOcrService {
  private readonly ocrEnabled = getEnvBool('OCR_ENABLED', true);
  private readonly tesseractBin =
    getEnv('OCR_TESSERACT_BIN', 'tesseract') ?? 'tesseract';
  private readonly pdftoppmBin =
    getEnv('OCR_PDFTOPPM_BIN', 'pdftoppm') ?? 'pdftoppm';
  private readonly ocrLangs = getEnv('OCR_LANGS', 'spa+eng') ?? 'spa+eng';
  private readonly ocrDpi = getEnvNumber('OCR_DPI', 300);
  private readonly ocrMaxPages = getEnvNumber('OCR_MAX_PAGES', 10);
  private readonly ocrTimeoutMs = getEnvNumber('OCR_TIMEOUT_MS', 120000);
  private readonly warnedCommands = new Set<string>();

  isEnabled() {
    return this.ocrEnabled;
  }

  async extractTextFromPdf(filePath: string): Promise<DocumentTextExtractionResult> {
    if (!this.ocrEnabled) {
      return {
        contentText: null,
        textSource: VersionTextSource.None,
        ocrApplied: false,
        ocrPageCount: null,
      };
    }

    const tempDir = await mkdtemp(join(tmpdir(), 'dms-ocr-'));
    const outputPrefix = join(tempDir, 'page');

    try {
      const pageLimit = Math.max(1, this.ocrMaxPages);
      await this.runCommand(this.pdftoppmBin, [
        '-r',
        String(this.ocrDpi),
        '-f',
        '1',
        '-l',
        String(pageLimit),
        '-png',
        filePath,
        outputPrefix,
      ]);

      const imageFiles = (await readdir(tempDir))
        .filter((file) => /^page-\d+\.png$/i.test(file))
        .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));

      if (imageFiles.length === 0) {
        return {
          contentText: null,
          textSource: VersionTextSource.None,
          ocrApplied: false,
          ocrPageCount: null,
        };
      }

      const extractedChunks: string[] = [];
      for (const imageFile of imageFiles) {
        const imagePath = join(tempDir, imageFile);
        const text = await this.runTesseract(imagePath);
        const normalized = normalizeExtractedText(text);
        if (normalized) {
          extractedChunks.push(normalized);
        }
      }

      return {
        contentText: normalizeExtractedText(extractedChunks.join('\n')),
        textSource: extractedChunks.length > 0 ? VersionTextSource.PdfOcr : VersionTextSource.None,
        ocrApplied: extractedChunks.length > 0,
        ocrPageCount: imageFiles.length,
      };
    } catch (error) {
      this.logOcrFailure(filePath, error);
      return {
        contentText: null,
        textSource: VersionTextSource.None,
        ocrApplied: false,
        ocrPageCount: null,
      };
    } finally {
      await rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  private async runTesseract(imagePath: string) {
    const { stdout } = await this.runCommand(this.tesseractBin, [
      imagePath,
      'stdout',
      '-l',
      this.ocrLangs,
      '--psm',
      '3',
    ]);
    return stdout;
  }

  private async runCommand(command: string, args: string[]) {
    return execFileAsync(command, args, {
      timeout: this.ocrTimeoutMs,
      maxBuffer: 16 * 1024 * 1024,
      windowsHide: true,
    });
  }

  private logOcrFailure(filePath: string, error: unknown) {
    const data = {
      filePath,
      tesseractBin: this.tesseractBin,
      pdftoppmBin: this.pdftoppmBin,
    };
    if (this.isMissingCommandError(error)) {
      const missingCommand = this.getMissingCommand(error);
      if (missingCommand && !this.warnedCommands.has(missingCommand)) {
        this.warnedCommands.add(missingCommand);
        writeAppLog({
          level: 'warn',
          event: 'ocr_dependency_missing',
          message:
            'OCR habilitado pero no se encontró una dependencia del sistema. Instala Tesseract y Poppler o configura OCR_TESSERACT_BIN/OCR_PDFTOPPM_BIN.',
          data: { ...data, missingCommand },
        });
      }
      return;
    }

    writeAppLog({
      level: 'warn',
      event: 'ocr_extraction_failed',
      message: 'No se pudo extraer texto por OCR del PDF escaneado',
      data: {
        ...data,
        error:
          error instanceof Error
            ? error.message
            : typeof error === 'string'
              ? error
              : 'unknown',
      },
    });
  }

  private isMissingCommandError(error: unknown) {
    return this.getMissingCommand(error) !== null;
  }

  private getMissingCommand(error: unknown) {
    if (!(error instanceof Error)) {
      return null;
    }
    const maybeError = error as Error & { code?: string; path?: string; spawnargs?: string[] };
    if (maybeError.code !== 'ENOENT') {
      return null;
    }
    return maybeError.path ?? maybeError.spawnargs?.[0] ?? null;
  }
}
