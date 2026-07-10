import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { UsersService } from '../../users/users.service';
import { UserRole } from '../../users/user-role.enum';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(private readonly usersService: UsersService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const user = request.user as { id?: number; role?: UserRole } | undefined;
    // Primera barrera: solo perfiles admin autenticados pueden continuar.
    if (!user?.id || user.role !== UserRole.Admin) {
      throw new ForbiddenException('Acceso restringido');
    }
    // Segunda barrera: valida en BD el flag de super admin vigente.
    const dbUser = await this.usersService.findById(user.id);
    if (!dbUser?.isSuperAdmin) {
      throw new ForbiddenException('Solo super admin');
    }
    return true;
  }
}
