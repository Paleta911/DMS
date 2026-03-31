import { IsArray, IsOptional, IsString, ArrayNotEmpty, IsEnum } from 'class-validator';
import { PermissionKey } from '../../users/permissions';

export class CreatePermissionRequestDto {
  @IsArray({ message: 'Los permisos deben ser un arreglo.' })
  @ArrayNotEmpty({ message: 'Selecciona al menos un permiso.' })
  @IsEnum(PermissionKey, { each: true, message: 'Permiso inválido.' })
  permissions: PermissionKey[];

  @IsOptional()
  @IsString({ message: 'El comentario debe ser texto.' })
  comment?: string;
}
