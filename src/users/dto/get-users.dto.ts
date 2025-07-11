import {
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Role } from '../../auth/enums/role.enum';
import { Type } from 'class-transformer';
import { OrderBy } from '../../common/enums';

export enum UserOrderField {
  ID = 'id',
  ROLE = 'role',
  NAME = 'name',
  SURNAME = 'surname',
  MAIL = 'mail',
  PHONE_PREFIX = 'phonePrefix',
  PHONE_NUMBER = 'phoneNumber',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}

export const USER_ORDER_FIELD_MAP: Record<string, string> = {
  id: 'id',
  role: 'role',
  name: 'name',
  surname: 'surname',
  mail: 'mail',
  phonePrefix: 'phone_prefix',
  phoneNumber: 'phone_number',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};

export class GetUsersDto {
  @IsEnum(Role)
  @IsOptional()
  role?: Role;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  id?: number;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  surname?: string;

  @IsString()
  @IsEmail()
  @IsOptional()
  mail?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(999)
  phonePrefix?: number;

  @IsNumber()
  @IsOptional()
  @Min(10000)
  phoneNumber?: number;

  @IsEnum(UserOrderField)
  @IsOptional()
  orderField?: UserOrderField = UserOrderField.ID;

  @IsEnum(OrderBy)
  @IsOptional()
  order?: OrderBy = OrderBy.ASC;
}
