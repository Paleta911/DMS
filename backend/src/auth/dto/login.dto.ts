import { IsEmail, IsString, MaxLength } from 'class-validator';
import {
  PASSWORD_MAX_LENGTH,
  USER_EMAIL_MAX_LENGTH,
} from '../../common/field-limits';

const buildMaxLengthMessage = (max: number) => `Máximo ${max} caracteres`;

export class LoginDto {
  @MaxLength(USER_EMAIL_MAX_LENGTH, { message: buildMaxLengthMessage(USER_EMAIL_MAX_LENGTH) })
  @IsEmail()
  email: string;

  @IsString()
  @MaxLength(PASSWORD_MAX_LENGTH, { message: buildMaxLengthMessage(PASSWORD_MAX_LENGTH) })
  password: string;
}
