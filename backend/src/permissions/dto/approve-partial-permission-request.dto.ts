import { ArrayNotEmpty, IsArray, IsOptional, IsString } from 'class-validator';

export class ApprovePartialPermissionRequestDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  areaCodes: string[];

  @IsOptional()
  @IsString()
  note?: string;
}
