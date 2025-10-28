import {
  IsArray,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Role } from '../../auth/enums/role.enum';
import { Transform, Type } from 'class-transformer';
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

export class UserOrderParamsDto {
  @Type(() => String)
  @IsEnum(UserOrderField)
  @IsNotEmpty()
  field: UserOrderField;

  @Type(() => String)
  @IsEnum(OrderBy)
  @IsOptional()
  order?: OrderBy;
}

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

  @Transform(({ value }) => {
    // Si no se ha proporcionado un valor o es indefinido, se devuelve
    if (!value) return value;

    try {
      // Si ya es un array, se devuelve
      if (Array.isArray(value)) {
        return value;
      }

      // Si es un string, se parsea para obtener el JSON correspondiente
      if (typeof value === 'string') {
        const parsed = JSON.parse(value);

        // Se verifica que sea un array
        if (Array.isArray(parsed)) {
          // Se crea la instancia de CourtOrderParamsDto para cada elemento
          return parsed.map((item) => {
            const orderParam = new UserOrderParamsDto();
            orderParam.field = item.field;
            orderParam.order = item.order ?? OrderBy.ASC;
            return orderParam;
          });
        }
      }

      return value;
    } catch (error) {
      console.error('Error parsing orderParams:', error);
      return value;
    }
  })
  @Type(() => UserOrderParamsDto)
  @IsArray()
  @ValidateNested({ each: true })
  @IsOptional()
  orderParams?: UserOrderParamsDto[];
}
