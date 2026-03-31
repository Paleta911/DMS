import {
  IsEmail,
  IsEnum,
  IsString,
  MinLength,
  IsOptional,
  Matches,
} from 'class-validator';
import { UserRole } from '../../users/user-role.enum';
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_POLICY_MESSAGE,
  PASSWORD_POLICY_REGEX,
} from '../password-policy';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @Matches(PASSWORD_POLICY_REGEX, {
    message: PASSWORD_POLICY_MESSAGE,
  })
  password: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
