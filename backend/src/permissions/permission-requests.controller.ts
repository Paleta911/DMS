import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreatePermissionRequestDto } from './dto/create-permission-request.dto';
import { PermissionRequestsService } from './permission-requests.service';
import { CreateAreaRequestDto } from './dto/create-area-request.dto';
import { MinePermissionRequestsQueryDto } from './dto/mine-permission-requests-query.dto';
import {
  throttleByUserIdOrIp,
  throttleFromEnv,
} from '../common/throttle.utils';

const permissionRequestThrottle = throttleFromEnv(
  'PERMISSION_REQUEST_LIMIT',
  'PERMISSION_REQUEST_TTL_SEC',
  8,
  300,
  { getTracker: throttleByUserIdOrIp },
);

const areaRequestThrottle = throttleFromEnv(
  'AREA_REQUEST_LIMIT',
  'AREA_REQUEST_TTL_SEC',
  8,
  300,
  { getTracker: throttleByUserIdOrIp },
);

@ApiTags('permission-requests')
@Controller('permission-requests')
export class PermissionRequestsController {
  constructor(private readonly requestsService: PermissionRequestsService) {}

  @UseGuards(JwtAuthGuard)
  @Throttle(permissionRequestThrottle)
  @Post()
  @ApiBearerAuth()
  async create(
    @Body() body: CreatePermissionRequestDto,
    @Req() req: Request & { user?: { id?: number } },
  ) {
    const userId = req.user?.id;
    if (!userId) {
      return null;
    }
    return this.requestsService.createRequest({
      userId,
      permissions: body.permissions,
      comment: body.comment,
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string | undefined,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Throttle(areaRequestThrottle)
  @Post('areas')
  @ApiBearerAuth()
  async createAreaRequest(
    @Body() body: CreateAreaRequestDto,
    @Req() req: Request & { user?: { id?: number } },
  ) {
    const userId = req.user?.id;
    if (!userId) {
      return null;
    }
    return this.requestsService.createAreaRequest({
      userId,
      areaCodes: body.areaCodes,
      comment: body.comment,
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string | undefined,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('mine')
  @ApiBearerAuth()
  async mine(
    @Req() req: Request & { user?: { id?: number } },
    @Query() query: MinePermissionRequestsQueryDto,
  ) {
    const userId = req.user?.id;
    if (!userId) {
      return { items: [], total: 0, page: 1, limit: query.limit ?? 20 };
    }
    return this.requestsService.listMine(userId, {
      page: query.page,
      limit: query.limit,
    });
  }
}
