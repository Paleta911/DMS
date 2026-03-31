import { ArrayNotEmpty, IsArray, IsOptional, IsString } from 'class-validator';

export class CreateAreaRequestDto {
  @IsArray({ message: 'Las áreas deben ser un arreglo.' })
  @ArrayNotEmpty({ message: 'Selecciona al menos un área.' })
  @IsString({ each: true, message: 'Código de área inválido.' })
  areaCodes: string[];

  @IsOptional()
  @IsString({ message: 'El comentario debe ser texto.' })
  comment?: string;
}
