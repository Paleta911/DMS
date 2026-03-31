import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

export class ReprocessDocumentContentDto {
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  documentId?: number;

  @Type(() => Boolean)
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}
