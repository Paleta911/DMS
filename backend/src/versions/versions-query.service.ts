import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Version } from './version.entity';
import { Document } from '../documents/document.entity';
import { DocumentStatus } from '../documents/document-status.enum';

@Injectable()
export class VersionsQueryService {
  constructor(
    @InjectRepository(Version)
    private readonly versionRepo: Repository<Version>,
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,
  ) {}

  findByDocument(documentId: number) {
    return this.versionRepo.find({
      where: { document: { id: documentId } },
      order: { createdAt: 'DESC' },
      relations: ['document', 'uploadedBy'],
    });
  }

  async findById(id: number) {
    const version = await this.versionRepo.findOne({
      where: { id },
      relations: ['document', 'document.areaCode'],
    });

    if (!version) {
      throw new NotFoundException('Version no encontrada');
    }

    return version;
  }

  async findDocumentStatus(documentId: number) {
    const document = await this.documentRepo.findOne({
      where: { id: documentId },
      select: ['id', 'status'],
    });

    if (!document) {
      throw new NotFoundException('Documento no encontrado');
    }

    return document.status as DocumentStatus;
  }
}
