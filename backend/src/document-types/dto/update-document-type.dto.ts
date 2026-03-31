import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateDocumentTypeDto {
  @IsOptional()
  @IsString({ message: 'El nombre largo debe ser texto.' })
  @MaxLength(120, { message: 'El nombre largo no debe exceder 120 caracteres.' })
  nombreLargo?: string;

  @IsOptional()
  @IsBoolean({ message: 'El estado activo debe ser verdadero o falso.' })
  activo?: boolean;
}
