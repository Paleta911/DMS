import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min, MinLength, ValidateIf } from 'class-validator';

export class UpdateDocumentDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  nombreDocumento?: string;

  @ValidateIf((_, value) => value !== null && value !== undefined)
  @Transform(({ value }) => (value === null ? null : Number(value)))
  @IsInt()
  @Min(1)
  categoryId?: number | null;

  @IsOptional()
  @IsString()
  documentTypeCode?: string;

  @IsOptional()
  @IsString()
  areaCode?: string;

  @IsOptional()
  @Transform(({ value }) => (value === null ? null : Number(value)))
  @IsInt()
  @Min(1)
  consecutivo?: number | null;
}
