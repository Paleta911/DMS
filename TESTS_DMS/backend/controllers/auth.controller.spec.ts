import { ForbiddenException } from '@nestjs/common';
import { AuthController } from '../../../backend/src/auth/auth.controller';

describe('AuthController external tests', () => {
  const authService = {
    login: jest.fn(),
    register: jest.fn(),
    verifyEmail: jest.fn(),
    refreshSession: jest.fn(),
    bootstrapAdmin: jest.fn(),
  };

  const controller = new AuthController(authService as any);

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.BOOTSTRAP_TOKEN;
  });

  it('delegates login with IP and user-agent', async () => {
    authService.login.mockResolvedValue({ ok: true });
    const req = {
      ip: '127.0.0.1',
      headers: { 'user-agent': 'jest' },
    } as any;

    await expect(controller.login({ email: 'a@b.com', password: '1234' } as any, req)).resolves.toEqual({ ok: true });
    expect(authService.login).toHaveBeenCalledWith(
      { email: 'a@b.com', password: '1234' },
      { ip: '127.0.0.1', userAgent: 'jest' },
    );
  });

  it('delegates register with actor context', async () => {
    authService.register.mockResolvedValue({ id: 1 });
    const req = {
      ip: '127.0.0.1',
      headers: { 'user-agent': 'jest' },
      user: { id: 99 },
    } as any;

    await controller.register({ email: 'u@bsm.com.mx' } as any, req);
    expect(authService.register).toHaveBeenCalledWith(
      { email: 'u@bsm.com.mx' },
      { actorId: 99, ip: '127.0.0.1', userAgent: 'jest' },
    );
  });

  it('delegates verifyEmail', async () => {
    authService.verifyEmail.mockResolvedValue({ verified: true });
    const req = { ip: '::1', headers: { 'user-agent': 'ua' } } as any;
    await controller.verifyEmail({ email: 'a@b.com', code: '123456' } as any, req);
    expect(authService.verifyEmail).toHaveBeenCalledWith(
      { email: 'a@b.com', code: '123456' },
      { ip: '::1', userAgent: 'ua' },
    );
  });

  it('delegates refreshSession', async () => {
    authService.refreshSession.mockResolvedValue({ accessToken: 'x' });
    const req = { ip: '::1', headers: {} } as any;
    await controller.refresh({ refreshToken: 'r' } as any, req);
    expect(authService.refreshSession).toHaveBeenCalledWith(
      { refreshToken: 'r' },
      { ip: '::1', userAgent: undefined },
    );
  });

  it('allows bootstrap without token when not configured', async () => {
    authService.bootstrapAdmin.mockResolvedValue({ id: 1 });
    await controller.bootstrap({ email: 'admin@local.com' } as any, { headers: {} } as any);
    expect(authService.bootstrapAdmin).toHaveBeenCalled();
  });

  it('rejects bootstrap with invalid token', () => {
    process.env.BOOTSTRAP_TOKEN = 'secret';
    expect(() =>
      controller.bootstrap({ email: 'admin@local.com' } as any, { headers: { 'x-bootstrap-token': 'bad' } } as any),
    ).toThrow(ForbiddenException);
  });

  it('allows bootstrap admin alias with valid token', async () => {
    process.env.BOOTSTRAP_TOKEN = 'secret';
    authService.bootstrapAdmin.mockResolvedValue({ ok: true });
    await controller.bootstrapAdmin(
      { email: 'admin@local.com' } as any,
      { headers: { 'x-bootstrap-token': 'secret' } } as any,
    );
    expect(authService.bootstrapAdmin).toHaveBeenCalledWith({ email: 'admin@local.com' });
  });
});
