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

export enum CourtDevicesOrderField {
  DEVICE_ID = 'deviceId',
}

export const COURT_DEVICES_ORDER_FIELD_MAP: Record<string, string> = {
  deviceId: 'device_id',
};

export class CourtDevicesOrderParamsDto {
  @Type(() => String)
  @IsEnum(CourtDevicesOrderField)
  @IsNotEmpty()
  field: CourtDevicesOrderField;

  @Type(() => String)
  @IsEnum(OrderBy)
  @IsOptional()
  order?: OrderBy;
}

export class GetCourtDevicesDto {
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  deviceId?: number;

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
          // Se crea la instancia de CourtDevicesOrderParamsDto para cada elemento
          return parsed.map((item) => {
            const orderParam = new CourtDevicesOrderParamsDto();
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
  @Type(() => CourtDevicesOrderParamsDto)
  @IsArray()
  @ValidateNested({ each: true })
  @IsOptional()
  orderParams?: CourtDevicesOrderParamsDto[];
}