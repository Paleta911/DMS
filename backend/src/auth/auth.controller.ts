import {
  Body,
  Controller,
  ForbiddenException,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { OptionalJwtAuthGuard } from './guards/optional-jwt-auth.guard';
import { getEnv } from '../common/env.utils';
import { RegisterDto } from './dto/register.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { VerificationEmailDto } from './dto/verification-email.dto';
import {
  throttleByIpAndEmail,
  throttleFromEnv,
} from '../common/throttle.utils';

const authRegisterThrottle = throttleFromEnv(
  'AUTH_REGISTER_LIMIT',
  'AUTH_REGISTER_TTL_SEC',
  6,
  300,
  { getTracker: throttleByIpAndEmail },
);

const authBootstrapThrottle = throttleFromEnv(
  'AUTH_BOOTSTRAP_LIMIT',
  'AUTH_BOOTSTRAP_TTL_SEC',
  3,
  300,
);

const authRefreshThrottle = throttleFromEnv(
  'AUTH_REFRESH_LIMIT',
  'AUTH_REFRESH_TTL_SEC',
  20,
  300,
  { getTracker: throttleByIpAndEmail },
);

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @SkipThrottle()
  @ApiOperation({ summary: 'Login and get JWT' })
  login(@Body() body: LoginDto, @Req() req: Request) {
    return this.authService.login(body, {
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string | undefined,
    });
  }

  @Post('register')
  @Throttle(authRegisterThrottle)
  @UseGuards(OptionalJwtAuthGuard)
  register(@Body() body: RegisterDto, @Req() req: Request) {
    return this.authService.register(body, {
      actorId: (req as Request & { user?: { id?: number } }).user?.id,
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string | undefined,
    });
  }

  @Post('verify-email')
  @SkipThrottle()
  verifyEmail(@Body() body: VerifyEmailDto, @Req() req: Request) {
    return this.authService.verifyEmail(body, {
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string | undefined,
    });
  }

  @Post('resend-verification-code')
  @SkipThrottle()
  resendVerificationCode(@Body() body: VerificationEmailDto, @Req() req: Request) {
    return this.authService.resendVerificationCode(body, {
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string | undefined,
    });
  }

  @Post('verification-status')
  @SkipThrottle()
  getVerificationStatus(@Body() body: VerificationEmailDto) {
    return this.authService.getVerificationStatus(body);
  }

  @Post('refresh')
  @Throttle(authRefreshThrottle)
  refresh(@Body() body: RefreshTokenDto, @Req() req: Request) {
    return this.authService.refreshSession(body, {
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string | undefined,
    });
  }

  @Post('bootstrap')
  @Throttle(authBootstrapThrottle)
  @ApiOperation({ summary: 'Bootstrap admin (first run)' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: { type: 'string', example: 'admin@local.com' },
        password: { type: 'string', example: 'Admin123' },
      },
    },
  })
  bootstrap(@Body() body: CreateUserDto, @Req() req: Request) {
    const token = getEnv('BOOTSTRAP_TOKEN');
    if (token) {
      const provided = req.headers['x-bootstrap-token'] as string | undefined;
      if (!provided || provided !== token) {
        throw new ForbiddenException('Bootstrap token invalido');
      }
    }
    return this.authService.bootstrapAdmin(body);
  }

  @Post('bootstrap-admin')
  @Throttle(authBootstrapThrottle)
  @ApiOperation({ summary: 'Bootstrap admin (alias)' })
  bootstrapAdmin(@Body() body: CreateUserDto, @Req() req: Request) {
    const token = getEnv('BOOTSTRAP_TOKEN');
    if (token) {
      const provided = req.headers['x-bootstrap-token'] as string | undefined;
      if (!provided || provided !== token) {
        throw new ForbiddenException('Bootstrap token invalido');
      }
    }
    return this.authService.bootstrapAdmin(body);
  }
}
