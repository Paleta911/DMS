import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AreaCode } from './area-code.entity';
import { AreaCodesService } from './area-codes.service';
import { AreaCodesController } from './area-codes.controller';
import { AreaCodesMutationService } from './area-codes-mutation.service';
import { AreaCodesQueryService } from './area-codes-query.service';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { Document } from '../documents/document.entity';

// Area codes module wires catalog CRUD + audit logging and exports service for cross-module use.
@Module({
  imports: [TypeOrmModule.forFeature([AreaCode, Document]), AuditLogModule],
  providers: [
    AreaCodesService,
    AreaCodesQueryService,
    AreaCodesMutationService,
  ],
  controllers: [AreaCodesController],
  exports: [AreaCodesService, TypeOrmModule],
})
export class AreaCodesModule {}
