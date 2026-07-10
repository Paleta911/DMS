import { NotFoundException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { AdminAnalyticsController } from './admin-analytics.controller';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ROLES_KEY } from '../auth/roles.decorator';
import { UserRole } from '../users/user-role.enum';

// Verifies admin-analytics controller auth metadata and feature-flag gate behavior.
describe('AdminAnalyticsController', () => {
  it('declara guardias y rol admin', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      AdminAnalyticsController.prototype.getSummary,
    );
    const roles = Reflect.getMetadata(
      ROLES_KEY,
      AdminAnalyticsController.prototype.getSummary,
    );

    expect(guards).toEqual([JwtAuthGuard, RolesGuard]);
    expect(roles).toEqual([UserRole.Admin]);
  });

  it('rechaza la consulta cuando la feature esta deshabilitada', () => {
    const controller = new AdminAnalyticsController(
      {
        getSummary: jest.fn(),
      } as never,
      {
        assertEnabled: jest.fn(() => {
          throw new NotFoundException(
            'La analitica administrativa no esta habilitada',
          );
        }),
      } as never,
    );

    expect(() => controller.getSummary()).toThrow(NotFoundException);
  });

  it('retorna el resumen cuando la feature esta habilitada', async () => {
    const getSummary = jest.fn().mockResolvedValue({ ok: true });
    const controller = new AdminAnalyticsController(
      {
        getSummary,
      } as never,
      {
        assertEnabled: jest.fn(),
      } as never,
    );

    await expect(controller.getSummary()).resolves.toEqual({ ok: true });
  });
});
