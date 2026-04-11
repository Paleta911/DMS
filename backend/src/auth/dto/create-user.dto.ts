import {
  IsEmail,
  IsEnum,
  IsString,
  MaxLength,
  MinLength,
  IsOptional,
  Matches,
} from 'class-validator';
import { UserRole } from '../../users/user-role.enum';
import {
  PASSWORD_MAX_LENGTH,
  USER_EMAIL_MAX_LENGTH,
} from '../../common/field-limits';
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_POLICY_MESSAGE,
  PASSWORD_POLICY_REGEX,
} from '../password-policy';

const buildMaxLengthMessage = (max: number) => `Máximo ${max} caracteres`;

export class CreateUserDto {
  @MaxLength(USER_EMAIL_MAX_LENGTH, { message: buildMaxLengthMessage(USER_EMAIL_MAX_LENGTH) })
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH, { message: buildMaxLengthMessage(PASSWORD_MAX_LENGTH) })
  @Matches(PASSWORD_POLICY_REGEX, {
    message: PASSWORD_POLICY_MESSAGE,
  })
  password: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
