import { Body, Controller, Get, Param, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user-role.enum';
import { SuperAdminGuard } from '../auth/guards/super-admin.guard';
import { RegistrationsQueryDto } from './dto/registrations-query.dto';
import { RejectRegistrationDto } from './dto/reject-registration.dto';
import { RegistrationsService } from './registrations.service';
import {
  throttleByUserIdOrIp,
  throttleFromEnv,
} from '../common/throttle.utils';

const adminRegistrationWriteThrottle = throttleFromEnv(
  'ADMIN_REGISTRATION_ACTION_LIMIT',
  'ADMIN_REGISTRATION_ACTION_TTL_SEC',
  30,
  60,
  { getTracker: throttleByUserIdOrIp },
);

@ApiTags('admin-registrations')
@Controller('admin/registrations')
export class RegistrationsController {
  constructor(private readonly registrationsService: RegistrationsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard, SuperAdminGuard)
  @Roles(UserRole.Admin)
  @Get()
  @ApiBearerAuth()
  list(@Query() query: RegistrationsQueryDto) {
    return this.registrationsService.list({
      status: query.status,
      page: query.page,
      limit: query.limit,
      q: query.q,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard, SuperAdminGuard)
  @Roles(UserRole.Admin)
  @Get('export.csv')
  @ApiBearerAuth()
  async exportCsv(@Query() query: RegistrationsQueryDto, @Res() res: Response) {
    const csv = await this.registrationsService.exportCsv({
      status: query.status,
      q: query.q,
      maxRows: query.maxRows,
    });
    const now = new Date();
    const datePart = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('-');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=\"registros-${datePart}.csv\"`);
    res.send(`\uFEFF${csv}`);
  }

  @UseGuards(JwtAuthGuard, RolesGuard, SuperAdminGuard)
  @Roles(UserRole.Admin)
  @Throttle(adminRegistrationWriteThrottle)
  @Post(':id/approve')
  @ApiBearerAuth()
  approve(
    @Param('id') id: string,
    @Req() req: Request & { user?: { id?: number } },
  ) {
    const adminId = req.user?.id ?? 0;
    return this.registrationsService.approve({
      id: Number(id),
      adminId,
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string | undefined,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard, SuperAdminGuard)
  @Roles(UserRole.Admin)
  @Throttle(adminRegistrationWriteThrottle)
  @Post(':id/reject')
  @ApiBearerAuth()
  reject(
    @Param('id') id: string,
    @Body() body: RejectRegistrationDto,
    @Req() req: Request & { user?: { id?: number } },
  ) {
    const adminId = req.user?.id ?? 0;
    return this.registrationsService.reject({
      id: Number(id),
      adminId,
      reason: body.reason,
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string | undefined,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard, SuperAdminGuard)
  @Roles(UserRole.Admin)
  @Throttle(adminRegistrationWriteThrottle)
  @Post(':id/resend-code')
  @ApiBearerAuth()
  resend(
    @Param('id') id: string,
    @Req() req: Request & { user?: { id?: number } },
  ) {
    const adminId = req.user?.id ?? 0;
    return this.registrationsService.resendCode({
      id: Number(id),
      adminId,
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string | undefined,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard, SuperAdminGuard)
  @Roles(UserRole.Admin)
  @Throttle(adminRegistrationWriteThrottle)
  @Post(':id/force-verify')
  @ApiBearerAuth()
  forceVerify(
    @Param('id') id: string,
    @Req() req: Request & { user?: { id?: number } },
  ) {
    const adminId = req.user?.id ?? 0;
    return this.registrationsService.forceVerify({
      id: Number(id),
      adminId,
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string | undefined,
    });
  }
}
