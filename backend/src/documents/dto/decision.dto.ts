import { IsIn, IsOptional, IsString } from 'class-validator';

export class DecisionDto {
  @IsIn(['APPROVED', 'REJECTED'])
  decision: 'APPROVED' | 'REJECTED';

  @IsOptional()
  @IsString()
  comentario?: string;
}
