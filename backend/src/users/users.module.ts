import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { DocumentApproval } from '../documents/document-approval.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { AreaCodesModule } from '../area-codes/area-codes.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { UserScopeService } from './user-scope.service';
import { UserAdminPolicyService } from './user-admin-policy.service';
import { UsersQueryService } from './users-query.service';
import { UsersMutationService } from './users-mutation.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, DocumentApproval]),
    AreaCodesModule,
    AuditLogModule,
  ],
  providers: [
    UsersService,
    UsersQueryService,
    UsersMutationService,
    UserScopeService,
    UserAdminPolicyService,
  ],
  controllers: [UsersController],
  exports: [UsersService, UserScopeService, UserAdminPolicyService, TypeOrmModule],
})
export class UsersModule {}
