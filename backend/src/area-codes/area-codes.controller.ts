import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AreaCodesService } from './area-codes.service';
import { ListCatalogDto } from '../common/dto/list-catalog.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user-role.enum';
import { CreateAreaCodeDto } from './dto/create-area-code.dto';
import { UpdateAreaCodeDto } from './dto/update-area-code.dto';
import { HttpAuditService } from '../audit-log/http-audit.service';

@ApiTags('area-codes')
@Controller('area-codes')
export class AreaCodesController {
  constructor(
    private readonly areaCodesService: AreaCodesService,
    private readonly httpAuditService: HttpAuditService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiBearerAuth()
  findAll(@Query() query: ListCatalogDto) {
    return this.areaCodesService.findAll({
      q: query.q,
      includeInactive: query.includeInactive,
      page: query.page,
      limit: query.limit,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @Post()
  @ApiBearerAuth()
  async create(@Body() body: CreateAreaCodeDto, @Req() req: any) {
    const created = await this.areaCodesService.create(body);
    await this.httpAuditService.logFromRequest(req, {
      action: 'AREA_CODE_CREATED',
      resourceType: 'area_code',
      resourceId: created.id,
      meta: { code: created.code, nombre: created.nombre },
    });
    return created;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @Patch(':id')
  @ApiBearerAuth()
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateAreaCodeDto,
    @Req() req: any,
  ) {
    const updated = await this.areaCodesService.update(id, body);
    await this.httpAuditService.logFromRequest(req, {
      action: 'AREA_CODE_UPDATED',
      resourceType: 'area_code',
      resourceId: updated.id,
      meta: { code: updated.code, nombre: updated.nombre },
    });
    return updated;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @Delete(':id')
  @ApiBearerAuth()
  async remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const result = await this.areaCodesService.remove(id);
    await this.httpAuditService.logFromRequest(req, {
      action: 'AREA_CODE_DEACTIVATED',
      resourceType: 'area_code',
      resourceId: id,
    });
    return result;
  }
}
