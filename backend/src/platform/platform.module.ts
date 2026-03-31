import { Global, Module } from '@nestjs/common';
import { FeatureFlagsService } from './feature-flags.service';
import { PlatformController } from './platform.controller';

@Global()
@Module({
  controllers: [PlatformController],
  providers: [FeatureFlagsService],
  exports: [FeatureFlagsService],
})
export class PlatformModule {}
