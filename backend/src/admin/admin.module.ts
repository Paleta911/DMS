import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/user.entity';
import { RegistrationsController } from './registrations.controller';
import { RegistrationsService } from './registrations.service';
import { EmailVerification } from '../auth/email-verification.entity';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { SuperAdminGuard } from '../auth/guards/super-admin.guard';
import { RegistrationsQueryService } from './registrations-query.service';
import { RegistrationsActionService } from './registrations-action.service';
import { Document } from '../documents/document.entity';
import { PermissionRequest } from '../permissions/permission-request.entity';
import { AuditLog } from '../audit-log/audit-log.entity';
import { AdminAnalyticsController } from './admin-analytics.controller';
import { AdminAnalyticsService } from './admin-analytics.service';
import { ObservabilityModule } from '../observability/observability.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      EmailVerification,
      Document,
      PermissionRequest,
      AuditLog,
    ]),
    AuditLogModule,
    AuthModule,
    UsersModule,
    ObservabilityModule,
  ],
  controllers: [RegistrationsController, AdminAnalyticsController],
  providers: [
    RegistrationsService,
    RegistrationsQueryService,
    RegistrationsActionService,
    AdminAnalyticsService,
    SuperAdminGuard,
  ],
})
export class AdminModule {}
