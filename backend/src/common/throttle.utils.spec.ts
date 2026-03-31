import {
  throttleByIpAndEmail,
  throttleByUserIdOrIp,
  throttleFromEnv,
} from './throttle.utils';

describe('throttle utils', () => {
  it('builds a tracker from ip and normalized email', async () => {
    const tracker = await throttleByIpAndEmail(
      {
        ip: '127.0.0.1',
        body: { email: '  USER@BSM.COM.MX ' },
      },
      {} as never,
    );

    expect(tracker).toBe('127.0.0.1:user@bsm.com.mx');
  });

  it('falls back to user id when available', async () => {
    const tracker = await throttleByUserIdOrIp(
      {
        ip: '127.0.0.1',
        user: { id: 19 },
      },
      {} as never,
    );

    expect(tracker).toBe('user:19');
  });

  it('injects tracker option into throttle config', () => {
    const config = throttleFromEnv(
      'TEST_LIMIT',
      'TEST_TTL',
      4,
      30,
      { getTracker: throttleByUserIdOrIp },
    );

    expect(config.default.limit).toBe(4);
    expect(config.default.ttl).toBe(30000);
    expect(config.default.getTracker).toBe(throttleByUserIdOrIp);
  });
});
