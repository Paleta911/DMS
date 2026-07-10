import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionRequest } from './permission-request.entity';
import { PermissionRequestsService } from './permission-requests.service';
import { PermissionRequestsController } from './permission-requests.controller';
import { AdminPermissionRequestsController } from './admin-permission-requests.controller';
import { UsersModule } from '../users/users.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { AreaCodesModule } from '../area-codes/area-codes.module';
import { PermissionRequestsCreateService } from './permission-requests-create.service';
import { PermissionRequestsQueryService } from './permission-requests-query.service';
import { PermissionRequestsReviewService } from './permission-requests-review.service';

// Permissions module bundles request lifecycle: creation, admin review, querying, and audit integration.
@Module({
  imports: [
    TypeOrmModule.forFeature([PermissionRequest]),
    UsersModule,
    AuditLogModule,
    AreaCodesModule,
  ],
  providers: [
    PermissionRequestsService,
    PermissionRequestsCreateService,
    PermissionRequestsQueryService,
    PermissionRequestsReviewService,
  ],
  controllers: [
    PermissionRequestsController,
    AdminPermissionRequestsController,
  ],
})
export class PermissionsModule {}
