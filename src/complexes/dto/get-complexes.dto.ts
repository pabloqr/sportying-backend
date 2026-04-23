import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Prisma } from 'prisma/generated/client';
import { OrderBy } from 'src/common/enums';
import { Coordinates } from 'src/common/validators';

export enum ComplexOrderField {
  ID = 'id',
  COMPLEX_NAME = 'complexId',
  TIME_INI = 'timeIni',
  TIME_END = 'timeEnd',
  LOC_LATITUDE = 'locLatitude',
  LOC_LONGITUDE = 'locLongitude',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}

export const COMPLEX_ORDER_FIELD_MAP: Record<string, string> = {
  id: 'id',
  complexName: 'complex_name',
  timeIni: 'time_ini',
  timeEnd: 'time_end',
  locLatitude: 'loc_latitude',
  locLongitude: 'loc_longitude',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};

export class ComplexOrderParamsDto {
  @Type(() => String)
  @IsEnum(ComplexOrderField)
  @IsNotEmpty()
  field: ComplexOrderField;

  @Type(() => String)
  @IsEnum(OrderBy)
  @IsOptional()
  order?: OrderBy;
}

export class GetComplexesDto {
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  id?: number;

  @IsString()
  @IsOptional()
  complexName?: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'Time must be in format HH:MM and valid.',
  })
  @IsOptional()
  timeIni?: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'Time must be in format HH:MM and valid.',
  })
  @IsOptional()
  timeEnd?: string;

  @Type(() => Number)
  @IsNumber()
  @Coordinates()
  @Min(-90)
  @Max(90)
  @IsOptional()
  locLatitude?: number;

  @Type(() => Number)
  @IsNumber()
  @Coordinates()
  @Min(-180)
  @Max(180)
  @IsOptional()
  locLongitude?: number;

  @Transform(({ value }) => {
    // Si no se ha proporcionado un valor o es indefinido, devolver
    if (!value) return value;

    try {
      // Si ya es un array, devolver
      if (Array.isArray(value)) {
        return value;
      }

      // Si es un string, parsear para obtener el JSON correspondiente
      if (typeof value === 'string') {
        const parsed = JSON.parse(value);

        // Verificar que sea un array
        if (Array.isArray(parsed)) {
          // Crear la instancia de ComplexOrderParamsDto para cada elemento
          return parsed.map((item) => {
            const orderParam = new ComplexOrderParamsDto();
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
  @Type(() => ComplexOrderParamsDto)
  @IsArray()
  @ValidateNested({ each: true })
  @IsOptional()
  orderParams?: ComplexOrderParamsDto[];
}
