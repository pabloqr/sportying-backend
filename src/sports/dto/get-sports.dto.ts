import { Transform, Type } from 'class-transformer';
import { IsArray, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { OrderBy } from '../../common/enums';

export enum SportOrderField {
  KEY = 'key',
  MIN_PEOPLE = 'minPeople',
  MAX_PEOPLE = 'maxPeople',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}

export const SPORT_ORDER_FIELD_MAP: Record<string, string> = {
  key: 'key',
  minPeople: 'min_people',
  maxPeople: 'max_people',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};

export class SportOrderParamsDto {
  @Type(() => String)
  @IsEnum(SportOrderField)
  @IsNotEmpty()
  field: SportOrderField;

  @Type(() => String)
  @IsEnum(OrderBy)
  @IsOptional()
  order?: OrderBy;
}

export class GetSportsDto {
  @IsString()
  @IsOptional()
  keys?: string[];

  @IsInt()
  @Min(1)
  @IsOptional()
  minPeople?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  maxPeople?: number;

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
          // Crear la instancia de SportOrderParamsDto para cada elemento
          return parsed.map((item) => {
            const orderParam = new SportOrderParamsDto();
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
  @Type(() => SportOrderParamsDto)
  @IsArray()
  @ValidateNested({ each: true })
  @IsOptional()
  orderParams?: SportOrderParamsDto[];
}
