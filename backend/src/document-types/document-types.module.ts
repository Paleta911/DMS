import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentType } from './document-type.entity';
import { DocumentTypesService } from './document-types.service';
import { DocumentTypesController } from './document-types.controller';
import { DocumentTypesMutationService } from './document-types-mutation.service';
import { DocumentTypesQueryService } from './document-types-query.service';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { Document } from '../documents/document.entity';

// Document types module encapsulates taxonomy catalog endpoints and related persistence services.
@Module({
  imports: [TypeOrmModule.forFeature([DocumentType, Document]), AuditLogModule],
  providers: [
    DocumentTypesService,
    DocumentTypesQueryService,
    DocumentTypesMutationService,
  ],
  controllers: [DocumentTypesController],
  exports: [DocumentTypesService, TypeOrmModule],
})
export class DocumentTypesModule {}
