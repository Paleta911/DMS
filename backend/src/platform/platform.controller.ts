import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { FeatureFlagsService } from './feature-flags.service';

// Platform controller provides feature flag snapshots to frontend for capability detection and UI rendering
@Controller('features')
export class PlatformController {
  constructor(private readonly featureFlagsService: FeatureFlagsService) {}

  // Return currently enabled features (bypasses throttle as client-side depends on this for initialization)
  @Get()
  @SkipThrottle()
  getFeatures() {
    return this.featureFlagsService.getSnapshot();
  }
}
