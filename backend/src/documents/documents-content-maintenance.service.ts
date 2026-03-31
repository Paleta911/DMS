import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { existsSync } from 'node:fs';
import { extname, join } from 'node:path';
import { Repository } from 'typeorm';
import { Version } from '../versions/version.entity';
import { SearchService } from '../search/search.service';
import { DocumentsFileService } from './documents-file.service';
import { VersionTextSource } from '../versions/version-text-source.enum';
import { UPLOAD_DIR } from './document-upload.policy';

@Injectable()
export class DocumentsContentMaintenanceService {
  constructor(
    @InjectRepository(Version)
    private readonly versionRepo: Repository<Version>,
    private readonly documentsFileService: DocumentsFileService,
    private readonly searchService: SearchService,
  ) {}

  async reprocessContent(params?: { documentId?: number; force?: boolean }) {
    const force = params?.force ?? false;
    const query = this.versionRepo
      .createQueryBuilder('version')
      .leftJoinAndSelect('version.document', 'document');

    if (params?.documentId) {
      query.where('document.id = :documentId', { documentId: params.documentId });
    }

    if (!force) {
      const method = params?.documentId ? 'andWhere' : 'where';
      query[method](
        '(version.contentText IS NULL OR version.contentText = \'\' OR version.textSource = :noneSource)',
        { noneSource: VersionTextSource.None },
      );
    }

    const versions = await query.orderBy('version.id', 'ASC').getMany();
    const touchedDocumentIds = new Set<number>();
    let processed = 0;
    let updated = 0;
    let skipped = 0;
    let missingFiles = 0;

    for (const version of versions) {
      processed += 1;
      const filePath = join(UPLOAD_DIR, version.storedName);
      if (!existsSync(filePath)) {
        missingFiles += 1;
        continue;
      }

      const details = await this.documentsFileService.extractTextDetails({
        filePath,
        originalName: version.originalName,
        mimeType: this.resolveMimeType(version.originalName),
      });

      const changed =
        version.contentText !== details.contentText ||
        version.textSource !== details.textSource ||
        version.ocrApplied !== details.ocrApplied ||
        (version.ocrPageCount ?? null) !== details.ocrPageCount;

      if (!changed) {
        skipped += 1;
        continue;
      }

      version.contentText = details.contentText;
      version.textSource = details.textSource;
      version.ocrApplied = details.ocrApplied;
      version.ocrPageCount = details.ocrPageCount;
      await this.versionRepo.save(version);
      updated += 1;
      if (version.document?.id) {
        touchedDocumentIds.add(version.document.id);
      }
    }

    if (touchedDocumentIds.size > 0) {
      for (const documentId of touchedDocumentIds) {
        this.searchService.enqueueIndexDocument(documentId);
      }
    }

    return {
      processed,
      updated,
      skipped,
      missingFiles,
      reindexedDocuments: touchedDocumentIds.size,
      force,
      documentId: params?.documentId ?? null,
    };
  }

  private resolveMimeType(originalName: string) {
    const extension = extname(originalName).toLowerCase();
    if (extension === '.pdf') {
      return 'application/pdf';
    }
    if (extension === '.docx') {
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    }
    if (extension === '.xlsx') {
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    }
    return 'application/octet-stream';
  }
}
