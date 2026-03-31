import { IsEnum, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { PermissionRequestStatus, PermissionRequestType } from '../permission-request.entity';
import { IsString } from 'class-validator';

export class PermissionRequestsQueryDto {
  @IsOptional()
  @IsEnum(PermissionRequestStatus)
  status?: PermissionRequestStatus;

  @IsOptional()
  @IsEnum(PermissionRequestType)
  type?: PermissionRequestType;

  @IsOptional()
  @IsString()
  user?: string;

  @IsOptional()
  @IsString()
  detail?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  maxRows?: number;
}
