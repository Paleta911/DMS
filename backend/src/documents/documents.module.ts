// src/documents/documents.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { Document } from './document.entity';
import { Version } from '../versions/version.entity';
import { Category } from '../categories/category.entity';
import { User } from '../users/user.entity';
import { DocumentType } from '../document-types/document-type.entity';
import { AreaCode } from '../area-codes/area-code.entity';
import { SearchModule } from '../search/search.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { UsersModule } from '../users/users.module';
import { DocumentApproval } from './document-approval.entity';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { DocumentsFileService } from './documents-file.service';
import { DocumentsAccessService } from './documents-access.service';
import { DocumentsWorkflowService } from './documents-workflow.service';
import { DocumentsQueryService } from './documents-query.service';
import { DocumentsMutationService } from './documents-mutation.service';
import { DocumentsOcrService } from './documents-ocr.service';
import { DocumentsContentMaintenanceService } from './documents-content-maintenance.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Document,
      Version,
      Category,
      User,
      DocumentType,
      AreaCode,
      DocumentApproval,
    ]),
    SearchModule,
    AuditLogModule,
    UsersModule,
  ],
  controllers: [DocumentsController],
  providers: [
    DocumentsService,
    DocumentsFileService,
    DocumentsOcrService,
    DocumentsAccessService,
    DocumentsWorkflowService,
    DocumentsQueryService,
    DocumentsMutationService,
    DocumentsContentMaintenanceService,
    PermissionsGuard,
  ],
})
export class DocumentsModule {}
