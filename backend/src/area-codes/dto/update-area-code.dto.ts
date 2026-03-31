import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateAreaCodeDto {
  @IsOptional()
  @IsString({ message: 'El nombre debe ser texto.' })
  @MaxLength(120, { message: 'El nombre no debe exceder 120 caracteres.' })
  nombre?: string;

  @IsOptional()
  @IsBoolean({ message: 'El estado activo debe ser verdadero o falso.' })
  activo?: boolean;
}
