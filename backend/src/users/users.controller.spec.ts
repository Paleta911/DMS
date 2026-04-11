import { GUARDS_METADATA } from '@nestjs/common/constants';
import { UsersController } from './users.controller';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ROLES_KEY } from '../auth/roles.decorator';
import { UserRole } from './user-role.enum';

describe('UsersController authz metadata', () => {
  const target = UsersController.prototype;

  it('protege /me con JwtAuthGuard', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, target.getMe);
    expect(guards).toEqual([JwtAuthGuard]);
  });

  it('protege PATCH /me con JwtAuthGuard', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, target.updateMe);
    expect(guards).toEqual([JwtAuthGuard]);
  });

  it('declara rol admin para busqueda, detalle y actualizacion de areas', () => {
    for (const method of [target.searchUsers, target.getUser, target.updateAreas]) {
      const guards = Reflect.getMetadata(GUARDS_METADATA, method);
      const roles = Reflect.getMetadata(ROLES_KEY, method);

      expect(guards).toEqual([JwtAuthGuard, RolesGuard]);
      expect(roles).toEqual([UserRole.Admin]);
    }
  });
});
