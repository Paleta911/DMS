// src/versions/versions.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VersionsController } from './versions.controller';
import { VersionsService } from './versions.service';
import { VersionsMutationService } from './versions-mutation.service';
import { VersionsQueryService } from './versions-query.service';
import { Version } from './version.entity';
import { Document } from '../documents/document.entity';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { UsersModule } from '../users/users.module';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([Version, Document]),
    AuditLogModule,
    UsersModule,
  ],
  controllers: [VersionsController],
  providers: [
    VersionsService,
    VersionsQueryService,
    VersionsMutationService,
    PermissionsGuard,
  ],
})
export class VersionsModule {}
