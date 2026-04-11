import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AreaCodesService } from '../area-codes/area-codes.service';
import { getSystemAccessBlockReason } from './user-access.policy';
import { UpdateMeDto } from './dto/update-me.dto';
import { User } from './user.entity';
import { UsersMutationService } from './users-mutation.service';
import { UsersQueryService } from './users-query.service';
import {
  assertBirthDateRange,
  normalizePersonName,
  normalizeRequestedAreaNombre,
} from './user-profile.rules';

type UpdateOwnProfileResult = {
  user: User;
  auditMeta: Record<string, unknown> | null;
};

@Injectable()
export class UsersProfileService {
  constructor(
    private readonly usersQueryService: UsersQueryService,
    private readonly usersMutationService: UsersMutationService,
    private readonly areaCodesService: AreaCodesService,
  ) {}

  async updateOwnProfile(userId: number, dto: UpdateMeDto): Promise<UpdateOwnProfileResult> {
    const user = await this.usersQueryService.findByIdWithAreas(userId);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const accessBlock = getSystemAccessBlockReason(user);
    if (accessBlock) {
      throw new ForbiddenException(accessBlock.message);
    }

    const previousAreaCodes = user.allowedAreaCodes?.map((area) => area.code) ?? [];
    const previousRequestedAreaNombre = user.requestedAreaNombre ?? null;
    const changedFields: string[] = [];
    let userDirty = false;
    let passwordChanged = false;

    if (dto.nombre !== undefined) {
      const nextNombre = normalizePersonName(dto.nombre);
      if (nextNombre && nextNombre !== (user.nombre ?? null)) {
        user.nombre = nextNombre;
        changedFields.push('nombre');
        userDirty = true;
      }
    }

    if (dto.primerApellido !== undefined) {
      const nextPrimerApellido = normalizePersonName(dto.primerApellido);
      if (nextPrimerApellido && nextPrimerApellido !== (user.primerApellido ?? null)) {
        user.primerApellido = nextPrimerApellido;
        changedFields.push('primerApellido');
        userDirty = true;
      }
    }

    if (dto.segundoApellido !== undefined) {
      const nextSegundoApellido = normalizePersonName(dto.segundoApellido ?? undefined);
      if ((user.segundoApellido ?? null) !== nextSegundoApellido) {
        user.segundoApellido = nextSegundoApellido;
        changedFields.push('segundoApellido');
        userDirty = true;
      }
    }

    if (dto.telefono !== undefined) {
      const nextTelefono = dto.telefono ?? null;
      if ((user.telefono ?? null) !== nextTelefono) {
        user.telefono = nextTelefono;
        changedFields.push('telefono');
        userDirty = true;
      }
    }

    if (dto.fechaNacimiento !== undefined) {
      assertBirthDateRange(dto.fechaNacimiento ?? undefined);
      const nextFechaNacimiento = dto.fechaNacimiento ? new Date(dto.fechaNacimiento) : null;
      if (this.serializeDate(user.fechaNacimiento) !== this.serializeDate(nextFechaNacimiento)) {
        user.fechaNacimiento = nextFechaNacimiento;
        changedFields.push('fechaNacimiento');
        userDirty = true;
      }
    }

    const wantsPasswordChange = Boolean(
      dto.currentPassword !== undefined ||
        dto.password !== undefined ||
        dto.confirmPassword !== undefined,
    );
    if (wantsPasswordChange) {
      if (!dto.currentPassword) {
        throw new BadRequestException('Escribe tu contraseña actual');
      }
      if (!dto.password) {
        throw new BadRequestException('Escribe tu nueva contraseña');
      }
      if (!dto.confirmPassword) {
        throw new BadRequestException('Confirma tu nueva contraseña');
      }
      if (dto.password !== dto.confirmPassword) {
        throw new BadRequestException('Las contraseñas no coinciden');
      }

      const userWithPassword = await this.usersQueryService.findByEmailWithPassword(user.email);
      if (!userWithPassword) {
        throw new NotFoundException('Usuario no encontrado');
      }

      const passwordMatches = await bcrypt.compare(
        dto.currentPassword,
        userWithPassword.passwordHash,
      );
      if (!passwordMatches) {
        throw new BadRequestException('La contraseña actual es incorrecta');
      }

      user.passwordHash = await bcrypt.hash(dto.password, 10);
      passwordChanged = true;
      userDirty = true;
      changedFields.push('password');
    }

    const wantsAreaUpdate =
      dto.areaCode !== undefined || dto.requestedAreaNombre !== undefined;
    let nextAreas = user.allowedAreaCodes ?? [];
    let nextRequestedAreaNombre = user.requestedAreaNombre ?? null;
    let areaChanged = false;

    if (wantsAreaUpdate) {
      const normalizedAreaCode = dto.areaCode?.trim().toUpperCase() ?? '';
      const normalizedRequestedAreaNombre = normalizeRequestedAreaNombre(
        dto.requestedAreaNombre,
      );

      if (
        !normalizedAreaCode &&
        dto.requestedAreaNombre !== undefined &&
        !normalizedRequestedAreaNombre
      ) {
        throw new BadRequestException('Escribe tu área');
      }
      if (!normalizedAreaCode && !normalizedRequestedAreaNombre) {
        throw new BadRequestException('Área requerida');
      }

      if (normalizedRequestedAreaNombre) {
        nextAreas = [];
        nextRequestedAreaNombre = normalizedRequestedAreaNombre;
      } else {
        nextAreas = [await this.resolveSelectedArea(normalizedAreaCode)];
        nextRequestedAreaNombre = null;
      }

      areaChanged =
        !this.sameCodes(previousAreaCodes, nextAreas.map((area) => area.code)) ||
        previousRequestedAreaNombre !== nextRequestedAreaNombre;

      if (areaChanged) {
        changedFields.push('area');
      }
      if ((user.requestedAreaNombre ?? null) !== nextRequestedAreaNombre) {
        user.requestedAreaNombre = nextRequestedAreaNombre;
        userDirty = true;
      }
    }

    let savedUser = user;
    if (userDirty) {
      savedUser = await this.usersMutationService.saveUser(user);
    }

    if (areaChanged) {
      const updatedUser = await this.usersMutationService.setAllowedAreas(user.id, nextAreas);
      if (!updatedUser) {
        throw new NotFoundException('Usuario no encontrado');
      }
      savedUser = updatedUser;
    }

    if (passwordChanged) {
      savedUser = await this.usersMutationService.clearFailedLoginState(savedUser);
    }

    const refreshedUser = await this.usersQueryService.findByIdWithAreas(savedUser.id);
    if (!refreshedUser) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return {
      user: refreshedUser,
      auditMeta:
        changedFields.length > 0
          ? {
              email: refreshedUser.email,
              updatedFields: changedFields,
              passwordChanged,
              previousAreaCodes,
              areaCodes:
                refreshedUser.allowedAreaCodes?.map((area) => area.code) ?? [],
              previousRequestedAreaNombre,
              requestedAreaNombre: refreshedUser.requestedAreaNombre ?? null,
            }
          : null,
    };
  }

  private async resolveSelectedArea(areaCode: string) {
    const activeAreas = await this.areaCodesService.findActiveList();
    const selectedArea = activeAreas.find((area) => area.code === areaCode) ?? null;
    if (!selectedArea) {
      throw new BadRequestException('Área inválida');
    }
    return selectedArea;
  }

  private sameCodes(previousCodes: string[], nextCodes: string[]) {
    const previous = [...previousCodes].sort();
    const next = [...nextCodes].sort();
    if (previous.length !== next.length) {
      return false;
    }
    return previous.every((code, index) => code === next[index]);
  }

  private serializeDate(value?: Date | string | null) {
    if (!value) {
      return null;
    }
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
    }
    const trimmedValue = String(value).trim();
    if (!trimmedValue) {
      return null;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedValue)) {
      return trimmedValue;
    }
    const parsedValue = new Date(trimmedValue);
    return Number.isNaN(parsedValue.getTime())
      ? null
      : parsedValue.toISOString().slice(0, 10);
  }
}
