import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Version } from './version.entity';

@Injectable()
export class VersionsQueryService {
  constructor(
    @InjectRepository(Version)
    private readonly versionRepo: Repository<Version>,
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
}
