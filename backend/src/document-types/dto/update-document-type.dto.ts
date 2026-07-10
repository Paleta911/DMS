import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateDocumentTypeDto {
  @IsOptional()
  @IsString({ message: 'El código debe ser texto.' })
  @MinLength(2, { message: 'El código debe tener al menos 2 caracteres.' })
  @MaxLength(24, { message: 'El código no debe exceder 24 caracteres.' })
  code?: string;

  @IsOptional()
  @IsString({ message: 'El nombre largo debe ser texto.' })
  @MaxLength(120, { message: 'El nombre largo no debe exceder 120 caracteres.' })
  nombreLargo?: string;

  @IsOptional()
  @IsBoolean({ message: 'El estado activo debe ser verdadero o falso.' })
  activo?: boolean;
}
