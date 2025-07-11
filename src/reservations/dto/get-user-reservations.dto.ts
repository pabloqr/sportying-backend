import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsNumber, IsOptional } from 'class-validator';
import { ReservationStatus, ReservationTimeFilter } from '../enums';

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
}
