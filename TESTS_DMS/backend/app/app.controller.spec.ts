import { AppController } from '../../../backend/src/app.controller';

describe('AppController external tests', () => {
  it('delegates hello to AppService', () => {
    const appService = {
      getHello: jest.fn().mockReturnValue('hola'),
      healthCheck: jest.fn(),
    };
    const controller = new AppController(appService as any);

    expect(controller.getHello()).toBe('hola');
    expect(appService.getHello).toHaveBeenCalledTimes(1);
  });

  it('delegates health to AppService', async () => {
    const appService = {
      getHello: jest.fn(),
      healthCheck: jest.fn().mockResolvedValue({ status: 'ok', db: 'up' }),
    };
    const controller = new AppController(appService as any);

    await expect(controller.health()).resolves.toEqual({ status: 'ok', db: 'up' });
    expect(appService.healthCheck).toHaveBeenCalledTimes(1);
  });
});
