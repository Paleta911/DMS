import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { DocumentVisibilityController } from './document-visibility.controller';
import { DocumentVisibilityPolicy } from './document-visibility-policy.entity';
import { DocumentVisibilityService } from './document-visibility.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([DocumentVisibilityPolicy]),
    AuditLogModule,
  ],
  controllers: [DocumentVisibilityController],
  providers: [DocumentVisibilityService],
  exports: [DocumentVisibilityService],
})
export class DocumentVisibilityModule {}
