import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from './user-role.enum';
import { UpdateUserAreasDto } from './dto/update-user-areas.dto';
import { AreaCodesService } from '../area-codes/area-codes.service';
import type { Request } from 'express';
import { HttpAuditService } from '../audit-log/http-audit.service';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly areaCodesService: AreaCodesService,
    private readonly httpAuditService: HttpAuditService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  async getMe(@Req() req: Request & { user?: { id?: number } }) {
    const userId = req.user?.id;
    if (!userId) {
      throw new NotFoundException('Usuario no encontrado');
    }
    const user = await this.usersService.findByIdWithAreas(userId);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    const tasks = await this.usersService.getPendingTasks(userId);
    return {
      ...this.usersService.toSafeUser(user),
      allowedAreaCodes: user.allowedAreaCodes?.map((area) => area.code) ?? [],
      tasks,
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @Get('search')
  @ApiBearerAuth()
  async searchUsers(@Query('q') q?: string, @Query('limit') limit?: string) {
    const parsedLimit = Number(limit ?? 10);
    const safeLimit = Number.isFinite(parsedLimit)
      ? Math.min(Math.max(parsedLimit, 1), 25)
      : 10;
    return this.usersService.searchUsers(q ?? '', safeLimit);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @Get(':id')
  @ApiBearerAuth()
  async getUser(@Param('id') id: string) {
    const user = await this.usersService.findByIdWithAreas(Number(id));
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return {
      ...this.usersService.toSafeUser(user),
      allowedAreaCodes: user.allowedAreaCodes?.map((area) => area.code) ?? [],
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @Patch(':id/areas')
  @ApiBearerAuth()
  async updateAreas(
    @Param('id') id: string,
    @Body() body: UpdateUserAreasDto,
    @Req() req: Request & { user?: { id?: number } },
  ) {
    const userId = Number(id);
    const existingUser = await this.usersService.findByIdWithAreas(userId);
    if (!existingUser) {
      throw new NotFoundException('Usuario no encontrado');
    }
    const previousCodes = existingUser.allowedAreaCodes?.map((area) => area.code) ?? [];
    const codes = body.areaCodes.map((code) => code.toUpperCase().trim()).filter(Boolean);
    if (codes.length === 0) {
      const user = await this.ensureUpdatedUser(
        await this.usersService.setAllowedAreas(userId, []),
      );
      const nextCodes = user.allowedAreaCodes?.map((area) => area.code) ?? [];
      await this.httpAuditService.logFromRequest(req, {
        action: 'USER_AREAS_UPDATED',
        resourceType: 'user',
        resourceId: user.id,
        meta: {
          email: user.email,
          previousAreaCodes: previousCodes,
          areaCodes: nextCodes,
          addedAreaCodes: nextCodes.filter((code) => !previousCodes.includes(code)),
          removedAreaCodes: previousCodes.filter((code) => !nextCodes.includes(code)),
        },
      });
      return {
        ...this.usersService.toSafeUser(user),
        allowedAreaCodes: user.allowedAreaCodes?.map((area) => area.code) ?? [],
      };
    }

    const allAreas = await this.areaCodesService.findActiveList();
    const allCodes = new Set(allAreas.map((area) => area.code));
    const invalidCodes = codes.filter((code) => !allCodes.has(code));
    if (invalidCodes.length > 0) {
      throw new NotFoundException(`Areas no encontradas: ${invalidCodes.join(', ')}`);
    }

    const allowed = allAreas.filter((area) => codes.includes(area.code));
    const user = await this.ensureUpdatedUser(
      await this.usersService.setAllowedAreas(userId, allowed),
    );
    const nextCodes = user.allowedAreaCodes?.map((area) => area.code) ?? [];
    await this.httpAuditService.logFromRequest(req, {
      action: 'USER_AREAS_UPDATED',
      resourceType: 'user',
      resourceId: user.id,
      meta: {
        email: user.email,
        previousAreaCodes: previousCodes,
        areaCodes: nextCodes,
        addedAreaCodes: nextCodes.filter((code) => !previousCodes.includes(code)),
        removedAreaCodes: previousCodes.filter((code) => !nextCodes.includes(code)),
      },
    });
    return {
      ...this.usersService.toSafeUser(user),
      allowedAreaCodes: user.allowedAreaCodes?.map((area) => area.code) ?? [],
    };
  }

  private ensureUpdatedUser<T>(user: T | null) {
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return user;
  }
}
