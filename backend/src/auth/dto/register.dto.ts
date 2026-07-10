import {
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
  IsDateString,
  IsEnum,
  Matches,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { UserRole } from '../../users/user-role.enum';
import {
  PASSWORD_MAX_LENGTH,
  USER_EMAIL_MAX_LENGTH,
  USER_NAME_MAX_LENGTH,
  USER_PHONE_MAX_LENGTH,
  USER_REQUESTED_AREA_MAX_LENGTH,
} from '../../common/field-limits';
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_POLICY_MESSAGE,
  PASSWORD_POLICY_REGEX,
} from '../password-policy';
import {
  buildMaxLengthMessage,
  NAME_MESSAGE,
  NAME_REGEX,
  normalizeTextValue,
  PHONE_ONLY_MESSAGE,
  PHONE_ONLY_REGEX,
} from '../../users/user-profile.rules';

export class RegisterDto {
  @IsOptional()
  @Transform(({ value }) => normalizeTextValue(value))
  @IsString()
  @MaxLength(USER_NAME_MAX_LENGTH, { message: buildMaxLengthMessage(USER_NAME_MAX_LENGTH) })
  @Matches(NAME_REGEX, { message: NAME_MESSAGE })
  nombre?: string;

  @IsOptional()
  @Transform(({ value }) => normalizeTextValue(value))
  @IsString()
  @MaxLength(USER_NAME_MAX_LENGTH, { message: buildMaxLengthMessage(USER_NAME_MAX_LENGTH) })
  @Matches(NAME_REGEX, { message: NAME_MESSAGE })
  primerApellido?: string;

  @IsOptional()
  @Transform(({ value }) => normalizeTextValue(value))
  @IsString()
  @MaxLength(USER_NAME_MAX_LENGTH, { message: buildMaxLengthMessage(USER_NAME_MAX_LENGTH) })
  @Matches(NAME_REGEX, { message: NAME_MESSAGE })
  segundoApellido?: string;

  @MaxLength(USER_EMAIL_MAX_LENGTH, { message: buildMaxLengthMessage(USER_EMAIL_MAX_LENGTH) })
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  areaCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(USER_REQUESTED_AREA_MAX_LENGTH, {
    message: buildMaxLengthMessage(USER_REQUESTED_AREA_MAX_LENGTH),
  })
  requestedAreaNombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(USER_PHONE_MAX_LENGTH, { message: PHONE_ONLY_MESSAGE })
  @Matches(PHONE_ONLY_REGEX, { message: PHONE_ONLY_MESSAGE })
  telefono?: string;

  @IsOptional()
  @IsDateString()
  fechaNacimiento?: string;

  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH, { message: buildMaxLengthMessage(PASSWORD_MAX_LENGTH) })
  @Matches(PASSWORD_POLICY_REGEX, {
    message: PASSWORD_POLICY_MESSAGE,
  })
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(PASSWORD_MAX_LENGTH, { message: buildMaxLengthMessage(PASSWORD_MAX_LENGTH) })
  confirmPassword?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
