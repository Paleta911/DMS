import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class UploadDocumentDto {
  @IsString()
  @MinLength(2)
  nombreDocumento: string;

  @IsOptional()
  @IsString()
  comentario?: string;

  @IsOptional()
  @IsString()
  documentTypeCode?: string;

  @IsOptional()
  @IsString()
  areaCode?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  consecutivo?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  categoryId?: number;
}
