import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { AppService } from './app.service';

// Root controller provides basic health monitoring and service availability endpoints
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  // Simple greeting endpoint for service verification
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  @SkipThrottle()
  health() {
    return this.appService.healthCheck();
  }
}
