import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { CourtStatus, Sport } from '../enums';
import { OrderBy } from '../../common/enums';

export enum CourtOrderField {
  ID = 'id',
  SPORT = 'sport',
  NAME = 'name',
  MAX_PEOPLE = 'maxPeople',
  STATUS = 'status',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}

export const COURT_ORDER_FIELD_MAP: Record<string, string> = {
  id: 'id',
  sport: 'sport',
  name: 'name',
  maxPeople: 'max_people',
  status: 'status',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};

export class CourtOrderParamsDto {
  @Type(() => String)
  @IsEnum(CourtOrderField)
  @IsNotEmpty()
  field: CourtOrderField;

  @Type(() => String)
  @IsEnum(OrderBy)
  @IsOptional()
  order?: OrderBy;
}

export class GetCourtsDto {
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  id?: number;

  @IsEnum(Sport)
  @IsOptional()
  sport?: Sport;

  @IsString()
  @IsOptional()
  name?: string;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  maxPeople?: number;

  @IsEnum(CourtStatus)
  @IsOptional()
  status?: CourtStatus;

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
            const orderParam = new CourtOrderParamsDto();
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
  @Type(() => CourtOrderParamsDto)
  @IsArray()
  @ValidateNested({ each: true })
  @IsOptional()
  orderParams?: CourtOrderParamsDto[];
}
