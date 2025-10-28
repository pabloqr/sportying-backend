import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
} from 'class-validator';
import {
  ReservationAvailabilityStatus,
  ReservationStatus,
  ReservationTimeFilter,
} from '../../reservations/enums';

export class ResponseReservationDto {
  @IsNumber()
  @IsNotEmpty()
  id: number;

  @IsNumber()
  @IsNotEmpty()
  userId: number;

  @IsNumber()
  @IsNotEmpty()
  complexId: number;

  @IsNumber()
  @IsNotEmpty()
  courtId: number;

  @IsDate()
  @IsNotEmpty()
  dateIni: Date;

  @IsDate()
  @IsNotEmpty()
  dateEnd: Date;

  @IsEnum(ReservationAvailabilityStatus)
  @IsNotEmpty()
  status: ReservationAvailabilityStatus;

  @IsEnum(ReservationStatus)
  @IsNotEmpty()
  reservationStatus: ReservationStatus;

  @IsEnum(ReservationTimeFilter)
  @IsOptional()
  timeFilter?: ReservationTimeFilter;

  @IsDate()
  @IsNotEmpty()
  createdAt: Date;

  @IsDate()
  @IsNotEmpty()
  updatedAt: Date;

  constructor(reservation: any) {
    this.id = reservation.id;
    this.userId = reservation.user_id ?? reservation.userId;
    this.complexId = reservation.complex_id ?? reservation.complexId;
    this.courtId = reservation.court_id ?? reservation.courtId;
    this.dateIni = new Date(reservation.date_ini ?? reservation.dateIni);
    this.dateEnd = new Date(reservation.date_end ?? reservation.dateEnd);
    this.status = reservation.status ?? reservation.status;
    this.reservationStatus =
      reservation.reservation_status ?? reservation.reservationStatus;
    this.timeFilter = reservation.time_filter ?? reservation.timeFilter;
    this.createdAt = new Date(reservation.created_at ?? reservation.createdAt);
    this.updatedAt = new Date(reservation.updated_at ?? reservation.updatedAt);
  }
}
