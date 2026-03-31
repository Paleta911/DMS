import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Version } from './version.entity';
import { Document } from '../documents/document.entity';
import { User } from '../users/user.entity';

@Injectable()
export class VersionsMutationService {
  constructor(
    @InjectRepository(Version)
    private readonly versionRepo: Repository<Version>,
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,
  ) {}

  async create(params: {
    documentId: number;
    storedName: string;
    originalName: string;
    comentario?: string;
    uploadedById?: number;
  }) {
    const document = await this.documentRepo.findOne({
      where: { id: params.documentId },
      relations: ['areaCode'],
    });

    if (!document) {
      throw new NotFoundException('Documento no encontrado');
    }

    const version = this.versionRepo.create({
      storedName: params.storedName,
      originalName: params.originalName,
      comentario: params.comentario ?? null,
      document,
      uploadedBy: params.uploadedById
        ? ({ id: params.uploadedById } as User)
        : null,
    });

    return this.versionRepo.save(version);
  }

  async getDocumentAreaCode(documentId: number) {
    const document = await this.documentRepo.findOne({
      where: { id: documentId },
      relations: ['areaCode'],
    });

    if (!document) {
      throw new NotFoundException('Documento no encontrado');
    }

    return document.areaCode?.code ?? null;
  }
}
