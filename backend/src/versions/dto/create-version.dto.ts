import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateVersionDto {
  @IsInt()
  @Min(1)
  documentId: number;

  @IsString()
  storedName: string;

  @IsString()
  originalName: string;

  @IsOptional()
  @IsString()
  comentario?: string;
}
