import { BadRequestException, Injectable } from '@nestjs/common';
import { readFileSync } from 'fs';
import { extname } from 'path';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { sanitizeUploadOriginalName } from './document-upload.policy';
import { DocumentsOcrService } from './documents-ocr.service';
import type { DocumentTextExtractionResult } from './document-text-extraction.types';
import { VersionTextSource } from '../versions/version-text-source.enum';

@Injectable()
export class DocumentsFileService {
  constructor(private readonly documentsOcrService: DocumentsOcrService) {}

  assertUploadFileSignature(params: {
    filePath: string;
    originalName: string;
    mimeType: string;
  }) {
    const originalName = sanitizeUploadOriginalName(params.originalName);
    const extension = extname(originalName).toLowerCase();
    const fileBuffer = readFileSync(params.filePath);
    if (fileBuffer.length === 0) {
      throw new BadRequestException('Archivo vacío o inválido');
    }
    const header = fileBuffer.subarray(0, 8);
    const trailer = fileBuffer.subarray(Math.max(0, fileBuffer.length - 1024));

    const isPdf =
      header[0] === 0x25 &&
      header[1] === 0x50 &&
      header[2] === 0x44 &&
      header[3] === 0x46 &&
      header[4] === 0x2d;

    const isZip =
      header[0] === 0x50 &&
      header[1] === 0x4b &&
      ((header[2] === 0x03 && header[3] === 0x04) ||
        (header[2] === 0x05 && header[3] === 0x06) ||
        (header[2] === 0x07 && header[3] === 0x08));
    const hasPdfEof = trailer.includes(Buffer.from('%%EOF', 'ascii'));
    const hasContentTypes = fileBuffer.includes(
      Buffer.from('[Content_Types].xml', 'utf8'),
    );
    const hasWordEntries = fileBuffer.includes(Buffer.from('word/', 'utf8'));
    const hasExcelEntries = fileBuffer.includes(Buffer.from('xl/', 'utf8'));

    if (extension === '.pdf' || params.mimeType === 'application/pdf') {
      if (!isPdf || !hasPdfEof) {
        throw new BadRequestException('Archivo PDF invalido o dañado');
      }
      return;
    }

    const isOfficeMime =
      params.mimeType ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      params.mimeType ===
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    if (extension === '.docx' || extension === '.xlsx' || isOfficeMime) {
      const hasExpectedEntries =
        hasContentTypes &&
        ((extension === '.docx' && hasWordEntries) ||
          (extension === '.xlsx' && hasExcelEntries));
      if (!isZip || !hasExpectedEntries) {
        throw new BadRequestException('Archivo Office invalido o dañado');
      }
    }
  }

  async extractTextDetails(params: {
    filePath: string;
    originalName: string;
    mimeType: string;
  }): Promise<DocumentTextExtractionResult> {
    const extension = extname(
      sanitizeUploadOriginalName(params.originalName),
    ).toLowerCase();
    try {
      if (extension === '.pdf' || params.mimeType === 'application/pdf') {
        const buffer = readFileSync(params.filePath);
        const data = await pdfParse(buffer);
        const nativeText = this.normalizeText(data.text);
        if (this.hasUsableText(nativeText)) {
          return {
            contentText: nativeText,
            textSource: VersionTextSource.PdfText,
            ocrApplied: false,
            ocrPageCount: null,
          };
        }

        const ocrResult = await this.documentsOcrService.extractTextFromPdf(
          params.filePath,
        );
        if (this.hasUsableText(ocrResult.contentText)) {
          return ocrResult;
        }
        return {
          contentText: null,
          textSource: VersionTextSource.None,
          ocrApplied: false,
          ocrPageCount: ocrResult.ocrPageCount,
        };
      }

      if (
        extension === '.docx' ||
        params.mimeType ===
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ) {
        const buffer = readFileSync(params.filePath);
        const data = await mammoth.extractRawText({ buffer });
        const normalized = this.normalizeText(data.value);
        return {
          contentText: normalized,
          textSource: normalized
            ? VersionTextSource.DocxText
            : VersionTextSource.None,
          ocrApplied: false,
          ocrPageCount: null,
        };
      }
    } catch {
      return {
        contentText: null,
        textSource: VersionTextSource.None,
        ocrApplied: false,
        ocrPageCount: null,
      };
    }

    return {
      contentText: null,
      textSource: VersionTextSource.None,
      ocrApplied: false,
      ocrPageCount: null,
    };
  }

  async extractContentText(params: {
    filePath: string;
    originalName: string;
    mimeType: string;
  }) {
    const details = await this.extractTextDetails(params);
    return details.contentText;
  }

  private normalizeText(value: string | null | undefined) {
    const normalized = (value ?? '').replace(/\s+/g, ' ').trim();
    return normalized.length > 0 ? normalized : null;
  }

  private hasUsableText(value: string | null) {
    if (!value) {
      return false;
    }
    const words = value.split(/\s+/).filter(Boolean).length;
    const alphanumeric = value.match(/[\p{L}\p{N}]/gu)?.length ?? 0;
    return words >= 4 && alphanumeric >= 20;
  }
}
