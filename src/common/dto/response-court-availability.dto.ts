import { Type } from 'class-transformer';
import { IsBoolean, IsDate, IsNotEmpty, IsNumber } from 'class-validator';

export class ResponseCourtAvailabilityDto {
  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  id: number;

  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  complexId: number;

  @IsDate()
  @IsNotEmpty()
  timeIni: Date;

  @IsDate()
  @IsNotEmpty()
  timeEnd: Date;

  @IsBoolean()
  @IsNotEmpty()
  available: boolean;
}
