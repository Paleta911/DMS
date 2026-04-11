import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateAreaCodeDto {
  @IsOptional()
  @IsString({ message: 'El código debe ser texto.' })
  @MinLength(2, { message: 'El código debe tener al menos 2 caracteres.' })
  @MaxLength(24, { message: 'El código no debe exceder 24 caracteres.' })
  code?: string;

  @IsOptional()
  @IsString({ message: 'El nombre debe ser texto.' })
  @MaxLength(120, { message: 'El nombre no debe exceder 120 caracteres.' })
  nombre?: string;

  @IsOptional()
  @IsBoolean({ message: 'El estado activo debe ser verdadero o falso.' })
  activo?: boolean;
}
