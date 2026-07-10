import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { USER_EMAIL_MAX_LENGTH } from '../../common/field-limits';

const buildMaxLengthMessage = (max: number) => `Máximo ${max} caracteres`;

export class VerifyEmailDto {
  @MaxLength(USER_EMAIL_MAX_LENGTH, { message: buildMaxLengthMessage(USER_EMAIL_MAX_LENGTH) })
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Ingresa el código' })
  code: string;
}
