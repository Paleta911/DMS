import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateDocumentVisibilityDto {
  @IsOptional()
  @IsBoolean()
  draftVisibleToUsers?: boolean;

  @IsOptional()
  @IsBoolean()
  inReviewVisibleToUsers?: boolean;

  @IsOptional()
  @IsBoolean()
  approvedVisibleToUsers?: boolean;

  @IsOptional()
  @IsBoolean()
  obsoleteVisibleToUsers?: boolean;
}
