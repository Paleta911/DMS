import { Controller, Get, Post, Query, UseGuards, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user-role.enum';
import { SearchQueryDto } from './dto/search-query.dto';
import { AuditLogService } from '../audit-log/audit-log.service';
import type { Request } from 'express';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionKey } from '../users/permissions';
import {
  throttleByUserIdOrIp,
  throttleFromEnv,
} from '../common/throttle.utils';

const searchReindexThrottle = throttleFromEnv(
  'SEARCH_REINDEX_LIMIT',
  'SEARCH_REINDEX_TTL_SEC',
  5,
  60,
  { getTracker: throttleByUserIdOrIp },
);

@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(
    private readonly searchService: SearchService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PermissionKey.Read)
  @Get()
  @ApiBearerAuth()
  async search(
    @Query() query: SearchQueryDto,
    @Req() req: Request & { user?: { id: number; role: UserRole } },
  ) {
    // Admin can include hidden statuses; regular users always get filtered visibility.
    const result = await this.searchService.search({
      ...query,
      includeHiddenStatuses: req.user?.role === UserRole.Admin,
    });
    await this.auditLogService.log({
      userId: req.user?.id ?? null,
      action: 'SEARCH_QUERY',
      resourceType: 'search',
      meta: {
        q: query.q ?? null,
        categoryId: query.categoryId ?? null,
        documentTypeCode: query.documentTypeCode ?? null,
        areaCode: query.areaCode ?? null,
        status: query.status ?? null,
        from: query.from ?? null,
        to: query.to ?? null,
      },
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string | undefined,
    });
    return result;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @Throttle(searchReindexThrottle)
  @Post('reindex')
  @ApiBearerAuth()
  reindex() {
    // Expensive operation is admin-only and throttled.
    return this.searchService.reindexAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @Get('index-status')
  @ApiBearerAuth()
  indexStatus() {
    return this.searchService.getIndexStatus();
  }
}
