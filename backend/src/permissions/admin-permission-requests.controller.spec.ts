import { GUARDS_METADATA } from '@nestjs/common/constants';
import { AdminPermissionRequestsController } from './admin-permission-requests.controller';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ROLES_KEY } from '../auth/roles.decorator';
import { UserRole } from '../users/user-role.enum';

// Metadata-level tests ensure admin endpoints remain protected by JWT + roles guard.
describe('AdminPermissionRequestsController authz metadata', () => {
  const target = AdminPermissionRequestsController.prototype;

  it('declara rol admin y guardias para listado, exportación y detalle', () => {
    for (const method of [target.list, target.exportCsv, target.findOne]) {
      const guards = Reflect.getMetadata(GUARDS_METADATA, method);
      const roles = Reflect.getMetadata(ROLES_KEY, method);

      expect(guards).toEqual([JwtAuthGuard, RolesGuard]);
      expect(roles).toEqual([UserRole.Admin]);
    }
  });

  it('declara rol admin y guardias para aprobar, aprobar parcial y rechazar', () => {
    for (const method of [
      target.approve,
      target.approvePartial,
      target.reject,
    ]) {
      const guards = Reflect.getMetadata(GUARDS_METADATA, method);
      const roles = Reflect.getMetadata(ROLES_KEY, method);

      expect(guards).toEqual([JwtAuthGuard, RolesGuard]);
      expect(roles).toEqual([UserRole.Admin]);
    }
  });
});
