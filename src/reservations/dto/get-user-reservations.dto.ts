import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { ReservationStatus, ReservationTimeFilter } from '../enums';
import { OrderBy } from '../../common/enums';

export enum ReservationOrderField {
  ID = 'id',
  COMPLEX_ID = 'complexId',
  COURT_ID = 'courtId',
  DATE_INI = 'dateIni',
  DATE_END = 'dateEnd',
  STATUS = 'status',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}

export const RESERVATION_ORDER_FIELD_MAP: Record<string, string> = {
  id: 'id',
  complexId: 'complex_id',
  courtId: 'court_id',
  dateIni: 'date_ini',
  dateEnd: 'date_end',
  status: 'status',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};

export class ReservationOrderParamsDto {
  @Type(() => String)
  @IsEnum(ReservationOrderField)
  @IsNotEmpty()
  field: ReservationOrderField;

  @Type(() => String)
  @IsEnum(OrderBy)
  @IsOptional()
  order?: OrderBy;
}

export class GetUserReservationsDto {
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  id?: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  complexId?: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  courtId?: number;

  @IsDate()
  @IsOptional()
  dateIni?: Date;

  @IsDate()
  @IsOptional()
  dateEnd?: Date;

  @IsEnum(ReservationStatus)
  @IsOptional()
  status?: ReservationStatus;

  @IsEnum(ReservationTimeFilter)
  @IsOptional()
  timeFilter?: ReservationTimeFilter;
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
            const orderParam = new ReservationOrderParamsDto();
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
  @Type(() => ReservationOrderParamsDto)
  @IsArray()
  @ValidateNested({ each: true })
  @IsOptional()
  orderParams?: ReservationOrderParamsDto[];
}
