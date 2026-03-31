import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user-role.enum';
import { AdminAnalyticsService } from './admin-analytics.service';
import { FeatureFlagsService } from '../platform/feature-flags.service';

@ApiTags('admin-analytics')
@Controller('admin/analytics')
export class AdminAnalyticsController {
  constructor(
    private readonly adminAnalyticsService: AdminAnalyticsService,
    private readonly featureFlagsService: FeatureFlagsService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @Get('summary')
  @ApiBearerAuth()
  getSummary() {
    this.featureFlagsService.assertEnabled(
      'admin-analytics',
      'La analitica administrativa no esta habilitada',
    );
    return this.adminAnalyticsService.getSummary();
  }
}
