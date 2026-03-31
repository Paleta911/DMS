import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { ListCatalogDto } from '../common/dto/list-catalog.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user-role.enum';
import { HttpAuditService } from '../audit-log/http-audit.service';

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(
    private readonly categoriesService: CategoriesService,
    private readonly httpAuditService: HttpAuditService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth()
  async create(
    @Body() body: CreateCategoryDto,
    @Req() req: Request & { user?: { id?: number } },
  ) {
    const created = await this.categoriesService.create(body.nombre);
    await this.httpAuditService.logFromRequest(req, {
      action: 'CATEGORY_CREATED',
      resourceType: 'category',
      resourceId: created.id,
      meta: { nombre: created.nombre },
    });
    return created;
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiBearerAuth()
  findAll(@Query() query: ListCatalogDto) {
    return this.categoriesService.findAll({
      q: query.q,
      includeInactive: query.includeInactive,
      page: query.page,
      limit: query.limit,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @Patch(':id')
  @ApiBearerAuth()
  async update(
    @Param('id') id: string,
    @Body() body: UpdateCategoryDto,
    @Req() req: Request & { user?: { id?: number } },
  ) {
    const updated = await this.categoriesService.update(Number(id), {
      nombre: body.nombre,
      activo: body.activo,
    });
    await this.httpAuditService.logFromRequest(req, {
      action: 'CATEGORY_UPDATED',
      resourceType: 'category',
      resourceId: updated.id,
      meta: { nombre: updated.nombre },
    });
    return updated;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @Delete(':id')
  @ApiBearerAuth()
  async remove(
    @Param('id') id: string,
    @Req() req: Request & { user?: { id?: number } },
  ) {
    const result = await this.categoriesService.remove(Number(id));
    await this.httpAuditService.logFromRequest(req, {
      action: 'CATEGORY_DELETED',
      resourceType: 'category',
      resourceId: Number(id),
    });
    return result;
  }
}
