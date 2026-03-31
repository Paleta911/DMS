import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from './audit-log.entity';
import { AuditLogService } from './audit-log.service';
import { AuditLogController } from './audit-log.controller';
import { HttpAuditService } from './http-audit.service';
import { AuditLogWriteService } from './audit-log-write.service';
import { AuditLogQueryService } from './audit-log-query.service';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  providers: [
    AuditLogService,
    AuditLogWriteService,
    AuditLogQueryService,
    HttpAuditService,
  ],
  controllers: [AuditLogController],
  exports: [AuditLogService, HttpAuditService],
})
export class AuditLogModule {}
