import { IsInt, Min } from 'class-validator';

export class AssignReviewersDto {
  @IsInt()
  @Min(1)
  revisoUserId: number;

  @IsInt()
  @Min(1)
  aproboUserId: number;
}
