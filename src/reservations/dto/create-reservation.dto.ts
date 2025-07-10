import { Type } from 'class-transformer';
import { IsDate, IsNotEmpty, IsNumber } from 'class-validator';

export class CreateReservationDto {
  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  userId: number;

  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  courtId: number;

  @Type(() => Date)
  @IsDate()
  @IsNotEmpty()
  dateIni: Date;

  @Type(() => Date)
  @IsDate()
  @IsNotEmpty()
  dateEnd: Date;
}
