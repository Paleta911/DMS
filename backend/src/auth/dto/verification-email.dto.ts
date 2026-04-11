import { IsEmail, MaxLength } from 'class-validator';
import { USER_EMAIL_MAX_LENGTH } from '../../common/field-limits';

const buildMaxLengthMessage = (max: number) => `Máximo ${max} caracteres`;

export class VerificationEmailDto {
  @MaxLength(USER_EMAIL_MAX_LENGTH, { message: buildMaxLengthMessage(USER_EMAIL_MAX_LENGTH) })
  @IsEmail()
  email: string;
}
