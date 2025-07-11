import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsNumber, IsOptional } from 'class-validator';
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

  @IsEnum(ReservationOrderField)
  @IsOptional()
  orderField?: ReservationOrderField = ReservationOrderField.ID;

  @IsEnum(OrderBy)
  @IsOptional()
  order?: OrderBy = OrderBy.ASC;
}
