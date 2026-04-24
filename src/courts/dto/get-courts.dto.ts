import { Transform, Type } from 'class-transformer';
import { IsArray, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Prisma } from '../../../prisma/generated/client.js';
import { OrderBy } from '../../common/enums/index.js';
import { OptionalCourtStatusData } from './optional-court-status-data.dto.js';

export enum CourtOrderField {
  ID = 'id',
  SPORT_KEY = 'sportKey',
  NUMBER = 'number',
  MAX_PEOPLE = 'maxPeople',
  STATUS = 'status',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}

export const COURT_ORDER_FIELD_MAP: Record<CourtOrderField, keyof Prisma.courtsOrderByWithRelationInput> = {
  id: 'id',
  sportKey: 'sport_key',
  number: 'number',
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

  @IsString()
  @IsOptional()
  sportKey?: string;

  @IsNumber()
  @IsOptional()
  number?: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  maxPeople?: number;

  @Transform(({ value }) => {
    // Si no se ha proporcionado un valor o es indefinido, devolver
    if (!value) return value;

    try {
      // Parsear para obtener el JSON correspondiente
      const parsed = typeof value === 'string' ? JSON.parse(value) : value;

      // Crear una instancia de OptionalCourtStatusData
      const courtStatus = new OptionalCourtStatusData();
      courtStatus.status = parsed.status;
      courtStatus.alertLevel = parsed.alertLevel;
      courtStatus.estimatedDryingTime = parsed.estimatedDryingTime;

      return courtStatus;
    } catch (error) {
      console.error('Error parsing statusData:', error);
      return value;
    }
  })
  @ValidateNested()
  @IsOptional()
  statusData?: OptionalCourtStatusData;

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
          // Crear la instancia de CourtOrderParamsDto para cada elemento
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


