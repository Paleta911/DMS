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
import { DocumentTypesService } from './document-types.service';
import { ListCatalogDto } from '../common/dto/list-catalog.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user-role.enum';
import { CreateDocumentTypeDto } from './dto/create-document-type.dto';
import { UpdateDocumentTypeDto } from './dto/update-document-type.dto';
import { HttpAuditService } from '../audit-log/http-audit.service';

@ApiTags('document-types')
@Controller('document-types')
export class DocumentTypesController {
  constructor(
    private readonly documentTypesService: DocumentTypesService,
    private readonly httpAuditService: HttpAuditService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiBearerAuth()
  findAll(@Query() query: ListCatalogDto) {
    return this.documentTypesService.findAll({
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
  async create(@Body() body: CreateDocumentTypeDto, @Req() req: any) {
    const created = await this.documentTypesService.create(body);
    await this.httpAuditService.logFromRequest(req, {
      action: 'DOCUMENT_TYPE_CREATED',
      resourceType: 'document_type',
      resourceId: created.id,
      meta: { code: created.code, nombreLargo: created.nombreLargo },
    });
    return created;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @Patch(':id')
  @ApiBearerAuth()
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateDocumentTypeDto,
    @Req() req: any,
  ) {
    const updated = await this.documentTypesService.update(id, body);
    await this.httpAuditService.logFromRequest(req, {
      action: 'DOCUMENT_TYPE_UPDATED',
      resourceType: 'document_type',
      resourceId: updated.id,
      meta: { code: updated.code, nombreLargo: updated.nombreLargo },
    });
    return updated;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @Delete(':id')
  @ApiBearerAuth()
  async remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const result = await this.documentTypesService.remove(id);
    await this.httpAuditService.logFromRequest(req, {
      action: 'DOCUMENT_TYPE_DEACTIVATED',
      resourceType: 'document_type',
      resourceId: id,
    });
    return result;
  }
}
