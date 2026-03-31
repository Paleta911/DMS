import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { FeatureFlagsService } from './feature-flags.service';

@Controller('features')
export class PlatformController {
  constructor(private readonly featureFlagsService: FeatureFlagsService) {}

  @Get()
  @SkipThrottle()
  getFeatures() {
    return this.featureFlagsService.getSnapshot();
  }
}
