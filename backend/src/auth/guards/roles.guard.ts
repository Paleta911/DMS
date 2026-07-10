import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../roles.decorator';
import { UserRole } from '../../users/user-role.enum';

// Role-based authorization guard: checks if user has required role(s) from @Roles() decorator
// Returns true (allow) if no @Roles() specified, otherwise validates user.role against required roles
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    // Extract required roles from @Roles() decorator metadata (method > class level)
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No @Roles() specified: endpoint is public to all authenticated users
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as { role?: UserRole } | undefined;

    // User missing or role not in required list: deny access
    if (!user?.role || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException('No tienes permisos');
    }

    return true;
  }
}
