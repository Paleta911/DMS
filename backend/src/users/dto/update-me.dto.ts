import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  PASSWORD_MAX_LENGTH,
  USER_NAME_MAX_LENGTH,
  USER_PHONE_MAX_LENGTH,
  USER_REQUESTED_AREA_MAX_LENGTH,
} from '../../common/field-limits';
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_POLICY_MESSAGE,
  PASSWORD_POLICY_REGEX,
} from '../../auth/password-policy';
import {
  buildMaxLengthMessage,
  emptyStringToNull,
  emptyStringToUndefined,
  NAME_MESSAGE,
  NAME_REGEX,
  normalizeNullableTextValue,
  normalizeOptionalCodeValue,
  normalizeTextValue,
  PHONE_ONLY_MESSAGE,
  PHONE_ONLY_REGEX,
} from '../user-profile.rules';

export class UpdateMeDto {
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
  @Transform(({ value }) => normalizeNullableTextValue(value))
  @IsString()
  @MaxLength(USER_NAME_MAX_LENGTH, { message: buildMaxLengthMessage(USER_NAME_MAX_LENGTH) })
  @Matches(NAME_REGEX, { message: NAME_MESSAGE })
  segundoApellido?: string | null;

  @IsOptional()
  @Transform(({ value }) => normalizeOptionalCodeValue(value))
  @IsString()
  areaCode?: string;

  @IsOptional()
  @Transform(({ value }) => normalizeNullableTextValue(value))
  @IsString()
  @MaxLength(USER_REQUESTED_AREA_MAX_LENGTH, {
    message: buildMaxLengthMessage(USER_REQUESTED_AREA_MAX_LENGTH),
  })
  requestedAreaNombre?: string | null;

  @IsOptional()
  @Transform(({ value }) => normalizeNullableTextValue(value))
  @IsString()
  @MaxLength(USER_PHONE_MAX_LENGTH, { message: PHONE_ONLY_MESSAGE })
  @Matches(PHONE_ONLY_REGEX, { message: PHONE_ONLY_MESSAGE })
  telefono?: string | null;

  @IsOptional()
  @Transform(({ value }) => emptyStringToNull(value))
  @IsDateString()
  fechaNacimiento?: string | null;

  @IsOptional()
  @Transform(({ value }) => emptyStringToUndefined(value))
  @IsString()
  @MaxLength(PASSWORD_MAX_LENGTH, { message: buildMaxLengthMessage(PASSWORD_MAX_LENGTH) })
  currentPassword?: string;

  @IsOptional()
  @Transform(({ value }) => emptyStringToUndefined(value))
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH, { message: buildMaxLengthMessage(PASSWORD_MAX_LENGTH) })
  @Matches(PASSWORD_POLICY_REGEX, {
    message: PASSWORD_POLICY_MESSAGE,
  })
  password?: string;

  @IsOptional()
  @Transform(({ value }) => emptyStringToUndefined(value))
  @IsString()
  @MaxLength(PASSWORD_MAX_LENGTH, { message: buildMaxLengthMessage(PASSWORD_MAX_LENGTH) })
  confirmPassword?: string;
}
