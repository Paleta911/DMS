import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user-role.enum';
import { PermissionRequestsService } from './permission-requests.service';
import { PermissionRequestsQueryDto } from './dto/permission-requests-query.dto';
import { RejectPermissionRequestDto } from './dto/reject-permission-request.dto';
import { ApprovePartialPermissionRequestDto } from './dto/approve-partial-permission-request.dto';
import {
  throttleByUserIdOrIp,
  throttleFromEnv,
} from '../common/throttle.utils';

// Admin write throttle mitigates accidental double-submits and scripted abuse.
const adminPermissionWriteThrottle = throttleFromEnv(
  'ADMIN_PERMISSION_ACTION_LIMIT',
  'ADMIN_PERMISSION_ACTION_TTL_SEC',
  40,
  60,
  { getTracker: throttleByUserIdOrIp },
);

@ApiTags('admin-permission-requests')
@Controller('admin/permission-requests')
export class AdminPermissionRequestsController {
  constructor(private readonly requestsService: PermissionRequestsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @Get()
  @ApiBearerAuth()
  async list(@Query() query: PermissionRequestsQueryDto) {
    return this.requestsService.listAll({
      status: query.status,
      type: query.type,
      user: query.user,
      detail: query.detail,
      page: query.page,
      limit: query.limit,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @Get('export.csv')
  @ApiBearerAuth()
  async exportCsv(
    @Query() query: PermissionRequestsQueryDto,
    @Res() res: Response,
  ) {
    const csv = await this.requestsService.exportCsv({
      status: query.status,
      type: query.type,
      user: query.user,
      detail: query.detail,
      maxRows: query.maxRows,
    });
    const now = new Date();
    const datePart = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('-');

    // UTF-8 BOM keeps accented characters readable in spreadsheet tools.
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=\"solicitudes-${datePart}.csv\"`,
    );
    res.send(`\uFEFF${csv}`);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @Get(':id')
  @ApiBearerAuth()
  async findOne(@Param('id') id: string) {
    return this.requestsService.getById(Number(id));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @Throttle(adminPermissionWriteThrottle)
  @Post(':id/approve')
  @ApiBearerAuth()
  async approve(
    @Param('id') id: string,
    @Req() req: Request & { user?: { id?: number } },
  ) {
    // Admin identity is taken from JWT context for audit traceability.
    const adminId = req.user?.id ?? 0;
    return this.requestsService.approveRequest({
      id: Number(id),
      adminId,
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string | undefined,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @Throttle(adminPermissionWriteThrottle)
  @Post(':id/approve-partial')
  @ApiBearerAuth()
  async approvePartial(
    @Param('id') id: string,
    @Body() body: ApprovePartialPermissionRequestDto,
    @Req() req: Request & { user?: { id?: number } },
  ) {
    // Partial approval is used for area requests when only subset should be granted.
    const adminId = req.user?.id ?? 0;
    return this.requestsService.approvePartialAreaRequest({
      id: Number(id),
      adminId,
      areaCodes: body.areaCodes,
      note: body.note,
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string | undefined,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @Throttle(adminPermissionWriteThrottle)
  @Post(':id/reject')
  @ApiBearerAuth()
  async reject(
    @Param('id') id: string,
    @Body() body: RejectPermissionRequestDto,
    @Req() req: Request & { user?: { id?: number } },
  ) {
    // Rejection can include reviewer reason for transparency.
    const adminId = req.user?.id ?? 0;
    return this.requestsService.rejectRequest({
      id: Number(id),
      adminId,
      reason: body.reason,
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string | undefined,
    });
  }
}
