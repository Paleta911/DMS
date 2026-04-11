import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { DocumentApproval } from '../documents/document-approval.entity';
import { PermissionRequest } from '../permissions/permission-request.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { AreaCodesModule } from '../area-codes/area-codes.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { UserScopeService } from './user-scope.service';
import { UserAdminPolicyService } from './user-admin-policy.service';
import { UsersQueryService } from './users-query.service';
import { UsersMutationService } from './users-mutation.service';
import { DeletedUserRecord } from './deleted-user-record.entity';
import { UserDeletionRegistryService } from './user-deletion-registry.service';
import { UserLifecycleService } from './user-lifecycle.service';
import { UsersProfileService } from './users-profile.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      DocumentApproval,
      PermissionRequest,
      DeletedUserRecord,
    ]),
    AreaCodesModule,
    AuditLogModule,
  ],
  providers: [
    UsersService,
    UsersQueryService,
    UsersMutationService,
    UserScopeService,
    UserAdminPolicyService,
    UserDeletionRegistryService,
    UserLifecycleService,
    UsersProfileService,
  ],
  controllers: [UsersController],
  exports: [
    UsersService,
    UserScopeService,
    UserAdminPolicyService,
    UserDeletionRegistryService,
    UserLifecycleService,
    TypeOrmModule,
  ],
})
export class UsersModule {}
