import { Transform, Type } from 'class-transformer';
import { IsArray, IsEnum, IsNotEmpty, IsNumber, IsOptional, ValidateNested } from 'class-validator';
import { Prisma } from 'prisma/generated/client';
import { OrderBy } from 'src/common/enums';
import { DeviceStatus, DeviceType } from 'src/devices/enum';

export enum DeviceOrderField {
  ID = 'id',
  COMPLEX_ID = 'complexId',
  TYPE = 'type',
  STATUS = 'status',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}

export const DEVICE_ORDER_FIELD_MAP: Record<DeviceOrderField, keyof Prisma.devicesOrderByWithRelationInput> = {
  id: 'id',
  complexId: 'complex_id',
  type: 'type',
  status: 'status',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};

export class DeviceOrderParamsDto {
  @Type(() => String)
  @IsEnum(DeviceOrderField)
  @IsNotEmpty()
  field: DeviceOrderField;

  @Type(() => String)
  @IsEnum(OrderBy)
  @IsOptional()
  order?: OrderBy;
}

export class GetDevicesDto {
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  id?: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  complexId?: number;

  @IsEnum(DeviceType)
  @IsOptional()
  type?: DeviceType;

  @IsEnum(DeviceStatus)
  @IsOptional()
  status?: DeviceStatus;

  @Transform(({ value }) => {
    // Si no se ha proporcionado un valor o es indefinido, devolver
    if (!value) return value;

    try {
      // Si ya es un array, convertir a valores numéricos y devolver
      if (Array.isArray(value)) {
        return value.map(Number);
      }

      // Si es un string, procesar para limpiarlo, formatearlo y devolverlo
      if (typeof value === 'string') {
        // Si se han incluido corchetes, eliminar
        const cleanValue = value.replace(/[\[\]]/g, '');
        // Separar los elementos por comas y convertir a números, filtrando valores vacíos
        return cleanValue
          .split(',')
          .filter((item) => item.trim() !== '')
          .map(Number);
      }

      return value;
    } catch (error) {
      console.error('Error transformando courts:', error);
      return value;
    }
  })
  @IsArray()
  @IsOptional()
  courts?: number[];

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
          // Crear la instancia de DeviceOrderParamsDto para cada elemento
          return parsed.map((item) => {
            const orderParam = new DeviceOrderParamsDto();
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
  @Type(() => DeviceOrderParamsDto)
  @IsArray()
  @ValidateNested({ each: true })
  @IsOptional()
  orderParams?: DeviceOrderParamsDto[];
}
