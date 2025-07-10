import { Type } from 'class-transformer';
import { IsNumber, IsOptional } from 'class-validator';
import { GetUserReservationsDto } from './get-user-reservations.dto';

export class GetReservationsDto extends GetUserReservationsDto {
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  userId?: number;
}
