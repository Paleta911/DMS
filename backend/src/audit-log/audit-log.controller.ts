import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user-role.enum';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { FeatureFlagsService } from '../platform/feature-flags.service';

// Admin-only audit controller: list records and export in CSV/JSON formats.
@ApiTags('audit-logs')
@Controller('audit-logs')
export class AuditLogController {
  constructor(
    private readonly auditLogService: AuditLogService,
    private readonly featureFlagsService: FeatureFlagsService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @Get()
  @ApiBearerAuth()
  findAll(@Query() query: AuditLogQueryDto) {
    return this.auditLogService.query(query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @Get('export.csv')
  @ApiBearerAuth()
  async exportCsv(@Query() query: AuditLogQueryDto, @Res() res: Response) {
    const csv = await this.auditLogService.exportCsv(query);
    const now = new Date();
    const datePart = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('-');

    // UTF-8 BOM improves compatibility with spreadsheet tools and accented text.
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="auditoria-${datePart}.csv"`,
    );
    res.send(`\uFEFF${csv}`);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @Get('export.json')
  @ApiBearerAuth()
  async exportJson(@Query() query: AuditLogQueryDto, @Res() res: Response) {
    // JSON export is feature-flagged for controlled rollout.
    this.featureFlagsService.assertEnabled(
      'audit-json-export',
      'La exportacion JSON de auditoria no esta habilitada',
    );
    const payload = await this.auditLogService.exportJson(query);
    const now = new Date();
    const datePart = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('-');

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="auditoria-${datePart}.json"`,
    );
    res.send(JSON.stringify(payload, null, 2));
  }
}
