import { GUARDS_METADATA } from '@nestjs/common/constants';
import { SearchController } from './search.controller';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PERMISSIONS_KEY } from '../auth/permissions.decorator';
import { PermissionKey } from '../users/permissions';
import { ROLES_KEY } from '../auth/roles.decorator';
import { UserRole } from '../users/user-role.enum';

describe('SearchController authz metadata', () => {
  const target = SearchController.prototype;

  it('declara permiso de lectura para buscar', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, target.search);
    const permissions = Reflect.getMetadata(PERMISSIONS_KEY, target.search);

    expect(guards).toEqual([JwtAuthGuard, PermissionsGuard]);
    expect(permissions).toEqual([PermissionKey.Read]);
  });

  it('declara rol admin para reindex e index-status', () => {
    for (const method of [target.reindex, target.indexStatus]) {
      const guards = Reflect.getMetadata(GUARDS_METADATA, method);
      const roles = Reflect.getMetadata(ROLES_KEY, method);

      expect(guards).toEqual([JwtAuthGuard, RolesGuard]);
      expect(roles).toEqual([UserRole.Admin]);
    }
  });
});
