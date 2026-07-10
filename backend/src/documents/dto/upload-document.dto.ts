import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class UploadDocumentDto {
  @IsString()
  @MinLength(2)
  nombreDocumento: string;

  @IsOptional()
  @IsString()
  comentario?: string;

  @IsOptional()
  @Transform(({ value }) =>
    value === true || value === 'true' || value === 1 || value === '1',
  )
  @IsBoolean()
  isInternal?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  documentId?: number;

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
