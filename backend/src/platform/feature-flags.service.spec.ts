import {
  DEFAULT_FEATURE_FLAGS,
  FeatureFlagsService,
} from './feature-flags.service';

// Validates default and env-driven behavior of runtime feature toggles.
describe('FeatureFlagsService', () => {
  const previous = process.env.FEATURE_FLAGS;

  afterEach(() => {
    process.env.FEATURE_FLAGS = previous;
  });

  it('usa las banderas por defecto cuando no se define FEATURE_FLAGS', () => {
    delete process.env.FEATURE_FLAGS;
    const service = new FeatureFlagsService();

    expect(service.getSnapshot().enabled).toEqual(
      [...DEFAULT_FEATURE_FLAGS].sort(),
    );
    expect(service.isEnabled('admin-analytics')).toBe(true);
  });

  it('respeta FEATURE_FLAGS cuando esta definida', () => {
    process.env.FEATURE_FLAGS = 'admin-analytics,notifications';
    const service = new FeatureFlagsService();

    expect(service.isEnabled('admin-analytics')).toBe(true);
    expect(service.isEnabled('dark-mode')).toBe(false);
  });
});
