import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../permissions.decorator';
import { PermissionKey } from '../../users/permissions';
import { UsersService } from '../../users/users.service';
import { AuditLogService } from '../../audit-log/audit-log.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly usersService: UsersService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const required = this.reflector.getAllAndOverride<PermissionKey[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) {
      return true;
    }
    const request = context.switchToHttp().getRequest();
    const user = request.user as { id?: number } | undefined;
    if (!user?.id) {
      throw new ForbiddenException('Acceso denegado');
    }
    try {
      await this.usersService.ensurePermissions(user.id, required);
      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        await this.auditLogService.log({
          userId: user.id,
          action: 'ACCESS_DENIED',
          resourceType: 'permissions',
          meta: { required },
          ip: request.ip,
          userAgent: request.headers['user-agent'] as string | undefined,
        });
      }
      throw error;
    }
  }
}
