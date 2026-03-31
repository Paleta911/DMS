import { IsOptional, IsString } from 'class-validator';

export class RejectPermissionRequestDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
