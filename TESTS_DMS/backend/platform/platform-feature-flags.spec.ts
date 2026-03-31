import { NotFoundException } from '@nestjs/common'
import {
  DEFAULT_FEATURE_FLAGS,
  FeatureFlagsService,
} from '../../../backend/src/platform/feature-flags.service'
import { PlatformController } from '../../../backend/src/platform/platform.controller'

describe('Platform and feature flags external tests', () => {
  const previousFlags = process.env.FEATURE_FLAGS

  afterEach(() => {
    process.env.FEATURE_FLAGS = previousFlags
  })

  it('uses default flags when env is not configured', () => {
    delete process.env.FEATURE_FLAGS
    const service = new FeatureFlagsService()

    expect(service.getSnapshot()).toEqual({
      enabled: [...DEFAULT_FEATURE_FLAGS].sort(),
    })
    expect(service.isEnabled('dark-mode')).toBe(true)
    expect(service.isEnabled('missing-flag')).toBe(false)
  })

  it('normalizes custom flags and trims whitespace', () => {
    process.env.FEATURE_FLAGS = ' notifications, dark-mode , saved-views '
    const service = new FeatureFlagsService()

    expect(service.isEnabled('notifications')).toBe(true)
    expect(service.isEnabled('dark-mode')).toBe(true)
    expect(service.isEnabled('saved-views')).toBe(true)
    expect(service.isEnabled('admin-analytics')).toBe(false)
  })

  it('assertEnabled throws a 404 when the flag is disabled', () => {
    process.env.FEATURE_FLAGS = 'notifications'
    const service = new FeatureFlagsService()

    expect(() => service.assertEnabled('dark-mode', 'No disponible')).toThrow(NotFoundException)
    expect(() => service.assertEnabled('notifications', 'No disponible')).not.toThrow()
  })

  it('controller returns the service snapshot', () => {
    const featureFlagsService = {
      getSnapshot: jest.fn().mockReturnValue({ enabled: ['dark-mode'] }),
    }
    const controller = new PlatformController(featureFlagsService as any)

    expect(controller.getFeatures()).toEqual({ enabled: ['dark-mode'] })
    expect(featureFlagsService.getSnapshot).toHaveBeenCalledTimes(1)
  })
})
