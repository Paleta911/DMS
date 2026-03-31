import { IsEnum, IsOptional, IsNumber, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { UserStatus } from '../../users/user-status.enum';

export class RegistrationsQueryDto {
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(10000)
  maxRows?: number;
}
