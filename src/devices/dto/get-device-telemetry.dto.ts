import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { OrderBy } from '../../common/enums';

export enum DeviceTelemetryOrderField {
  VALUE = 'value',
  CREATED_AT = 'createdAt',
}

export const DEVICE_TELEMETRY_ORDER_FIELD_MAP: Record<string, string> = {
  value: 'value',
  createdAt: 'created_at',
};

export class DeviceTelemetryOrderParamsDto {
  @Type(() => String)
  @IsEnum(DeviceTelemetryOrderField)
  @IsNotEmpty()
  field: DeviceTelemetryOrderField;

  @Type(() => String)
  @IsEnum(OrderBy)
  @IsOptional()
  order?: OrderBy;
}

export class GetDeviceTelemetryDto {
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  minValue?: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  maxValue?: number;

  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  last?: boolean;

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
          // Se crea la instancia de DeviceTelemetryOrderParamsDto para cada elemento
          return parsed.map((item) => {
            const orderParam = new DeviceTelemetryOrderParamsDto();
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
  @Type(() => DeviceTelemetryOrderParamsDto)
  @IsArray()
  @ValidateNested({ each: true })
  @IsOptional()
  orderParams?: DeviceTelemetryOrderParamsDto[];
}
