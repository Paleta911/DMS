import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserRole } from '../users/user-role.enum';
import { getRequiredEnv } from '../common/security-config.utils';
import { UsersService } from '../users/users.service';
import { getSystemAccessBlockReason } from '../users/user-access.policy';

// JWT Passport strategy extracts Bearer token, validates signature, and checks user access status
// Blocks permanently deleted accounts and system-access-blocked users on each request
export interface JwtPayload {
  sub: number;
  email: string;
  role: UserRole;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getRequiredEnv('JWT_SECRET'),
    });
  }

  // Validate JWT payload: check user still exists, not permanently deleted, and not access-blocked
  async validate(payload: JwtPayload) {
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      // Check if user was permanently deleted (prevents re-login with old tokens)
      const deletedRecord =
        await this.usersService.findPermanentlyDeletedByEmail(payload.email);
      if (deletedRecord) {
        throw new UnauthorizedException(
          'Cuenta eliminada por el administrador',
        );
      }
      throw new UnauthorizedException(
        'Sesion expirada. Inicia sesión nuevamente',
      );
    }

    // Check system-level access blocks (suspension, etc.)
    const accessBlock = getSystemAccessBlockReason(user);
    if (accessBlock) {
      throw new UnauthorizedException(accessBlock.message);
    }

    return { id: user.id, email: user.email, role: user.role };
  }
}
