import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { JwtStrategy } from './jwt.strategy';
import { getEnv } from '../common/env.utils';
import { getRequiredEnv } from '../common/security-config.utils';
import type { StringValue } from 'ms';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailVerification } from './email-verification.entity';
import { EmailModule } from '../email/email.module';
import { VerificationService } from './verification.service';
import { AuthRegistrationService } from './auth-registration.service';
import { AuthLoginService } from './auth-login.service';
import { AuthEmailVerificationFlowService } from './auth-email-verification-flow.service';
import { AreaCodesModule } from '../area-codes/area-codes.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([EmailVerification]),
    UsersModule,
    AreaCodesModule,
    AuditLogModule,
    EmailModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: () => {
        const secret = getRequiredEnv('JWT_SECRET');
        const expiresIn = getEnv('JWT_EXPIRES_IN', '1d') ?? '1d';
        return {
          secret,
          signOptions: { expiresIn: expiresIn as StringValue },
        };
      },
    }),
  ],
  providers: [
    AuthService,
    JwtStrategy,
    VerificationService,
    AuthRegistrationService,
    AuthLoginService,
    AuthEmailVerificationFlowService,
  ],
  controllers: [AuthController],
  exports: [VerificationService],
})
export class AuthModule {}
