import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { OrderBy } from '../../common/enums';

export enum DeviceCourtsOrderField {
  COURT_ID = 'courtId',
}

export const DEVICE_COURTS_ORDER_FIELD_MAP: Record<string, string> = {
  courtId: 'court_id',
};

export class DeviceCourtsOrderParamsDto {
  @Type(() => String)
  @IsEnum(DeviceCourtsOrderField)
  @IsNotEmpty()
  field: DeviceCourtsOrderField;

  @Type(() => String)
  @IsEnum(OrderBy)
  @IsOptional()
  order?: OrderBy;
}

export class GetDeviceCourtsDto {
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  courtId?: number;

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
          // Se crea la instancia de DeviceCourtsOrderParamsDto para cada elemento
          return parsed.map((item) => {
            const orderParam = new DeviceCourtsOrderParamsDto();
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
  @Type(() => DeviceCourtsOrderParamsDto)
  @IsArray()
  @ValidateNested({ each: true })
  @IsOptional()
  orderParams?: DeviceCourtsOrderParamsDto[];
}