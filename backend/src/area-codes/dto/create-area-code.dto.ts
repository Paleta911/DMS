import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateAreaCodeDto {
  @IsString({ message: 'El código debe ser texto.' })
  @MinLength(2, { message: 'El código debe tener al menos 2 caracteres.' })
  code: string;

  @IsString({ message: 'El nombre debe ser texto.' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres.' })
  nombre: string;

  @IsOptional()
  @IsBoolean({ message: 'El campo activo debe ser verdadero o falso.' })
  activo?: boolean;
}
