import { GUARDS_METADATA } from '@nestjs/common/constants';
import { RegistrationsController } from './registrations.controller';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SuperAdminGuard } from '../auth/guards/super-admin.guard';
import { ROLES_KEY } from '../auth/roles.decorator';
import { UserRole } from '../users/user-role.enum';

describe('RegistrationsController authz metadata', () => {
  const target = RegistrationsController.prototype;

  it('declara guardias y rol admin para listar y exportar registros', () => {
    for (const method of [target.list, target.exportCsv]) {
      const guards = Reflect.getMetadata(GUARDS_METADATA, method);
      const roles = Reflect.getMetadata(ROLES_KEY, method);

      expect(guards).toEqual([JwtAuthGuard, RolesGuard, SuperAdminGuard]);
      expect(roles).toEqual([UserRole.Admin]);
    }
  });

  it('declara guardias y rol admin para aprobar/rechazar acciones sensibles', () => {
    for (const method of [
      target.approve,
      target.reject,
      target.resend,
      target.forceVerify,
    ]) {
      const guards = Reflect.getMetadata(GUARDS_METADATA, method);
      const roles = Reflect.getMetadata(ROLES_KEY, method);

      expect(guards).toEqual([JwtAuthGuard, RolesGuard, SuperAdminGuard]);
      expect(roles).toEqual([UserRole.Admin]);
    }
  });
});
