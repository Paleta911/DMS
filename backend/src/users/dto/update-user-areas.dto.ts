import { IsArray, IsString } from 'class-validator';

export class UpdateUserAreasDto {
  @IsArray()
  @IsString({ each: true })
  areaCodes: string[];
}
