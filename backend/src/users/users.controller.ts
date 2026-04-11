import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
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
import { getSystemAccessBlockReason } from './user-access.policy';
import { UpdateMeDto } from './dto/update-me.dto';
import { UsersProfileService } from './users-profile.service';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly usersProfileService: UsersProfileService,
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
    const accessBlock = getSystemAccessBlockReason(user);
    if (accessBlock) {
      throw new ForbiddenException(accessBlock.message);
    }
    const tasks = await this.usersService.getPendingTasks(userId);
    return {
      ...this.usersService.toSafeUser(user),
      allowedAreaCodes: user.allowedAreaCodes?.map((area) => area.code) ?? [],
      tasks,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  @ApiBearerAuth()
  async updateMe(
    @Req() req: Request & { user?: { id?: number } },
    @Body() body: UpdateMeDto,
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const result = await this.usersProfileService.updateOwnProfile(userId, body);
    if (result.auditMeta) {
      await this.httpAuditService.logFromRequest(req, {
        action: 'USER_PROFILE_UPDATED',
        resourceType: 'user',
        resourceId: result.user.id,
        meta: result.auditMeta,
      });
    }
    const tasks = await this.usersService.getPendingTasks(result.user.id);
    return {
      ...this.usersService.toSafeUser(result.user),
      allowedAreaCodes: result.user.allowedAreaCodes?.map((area) => area.code) ?? [],
      tasks,
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @Get('search')
  @ApiBearerAuth()
  async searchUsers(
    @Query('q') q?: string,
    @Query('limit') limit?: string,
    @Query('recent') recent?: string,
    @Query('status') status?: string,
    @Query('role') role?: string,
    @Query('areaState') areaState?: string,
  ) {
    const normalizedLimit = limit?.trim() ?? '';
    const parsedLimit = normalizedLimit ? Number(normalizedLimit) : undefined;
    const safeLimit =
      parsedLimit !== undefined && Number.isFinite(parsedLimit)
        ? Math.min(Math.max(parsedLimit, 1), 500)
        : undefined;
    const useRecent = ['1', 'true', 'yes'].includes((recent ?? '').toLowerCase());
    return this.usersService.searchUsers(q ?? '', safeLimit, useRecent, {
      status,
      role,
      areaState,
    });
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
    const previousRequestedAreaNombre = existingUser.requestedAreaNombre ?? null;
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
          previousRequestedAreaNombre,
          requestedAreaNombre: user.requestedAreaNombre ?? null,
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
    let user = await this.ensureUpdatedUser(
      await this.usersService.setAllowedAreas(userId, allowed),
    );
    if (user.requestedAreaNombre && codes.length > 0) {
      user.requestedAreaNombre = null;
      user = await this.ensureUpdatedUser(await this.usersService.saveUser(user));
    }
    const nextCodes = user.allowedAreaCodes?.map((area) => area.code) ?? [];
    await this.httpAuditService.logFromRequest(req, {
      action: 'USER_AREAS_UPDATED',
      resourceType: 'user',
      resourceId: user.id,
      meta: {
        email: user.email,
        previousAreaCodes: previousCodes,
        areaCodes: nextCodes,
        previousRequestedAreaNombre,
        requestedAreaNombre: user.requestedAreaNombre ?? null,
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

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @Post(':id/restore')
  @ApiBearerAuth()
  restoreDeletedUser(
    @Param('id') id: string,
    @Req() req: Request & { user?: { id?: number } },
  ) {
    const adminId = req.user?.id ?? 0;
    return this.usersService.restoreDeletedUser({
      id: Number(id),
      adminId,
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string | undefined,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @Delete(':id/permanent')
  @ApiBearerAuth()
  permanentlyDeleteUser(
    @Param('id') id: string,
    @Req() req: Request & { user?: { id?: number } },
  ) {
    const adminId = req.user?.id ?? 0;
    return this.usersService.permanentlyDeleteUser({
      id: Number(id),
      adminId,
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string | undefined,
    });
  }
}
