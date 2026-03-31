import {
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
  IsDateString,
  IsEnum,
  Matches,
} from 'class-validator';
import { UserRole } from '../../users/user-role.enum';
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_POLICY_MESSAGE,
  PASSWORD_POLICY_REGEX,
} from '../password-policy';

export class RegisterDto {
  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsString()
  primerApellido?: string;

  @IsOptional()
  @IsString()
  segundoApellido?: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsDateString()
  fechaNacimiento?: string;

  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @Matches(PASSWORD_POLICY_REGEX, {
    message: PASSWORD_POLICY_MESSAGE,
  })
  password: string;

  @IsOptional()
  @IsString()
  confirmPassword?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
