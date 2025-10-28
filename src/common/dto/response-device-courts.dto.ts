import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsNumber } from 'class-validator';
import { ResponseCourtDto } from './response-court.dto';

export class ResponseDeviceCourtsDto {
  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  id: number;

  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  complexId: number;

  @IsArray()
  @IsNotEmpty()
  courts: ResponseCourtDto[];

  constructor(deviceCourts: any) {
    this.id = deviceCourts.device_id ?? deviceCourts.deviceId;
    this.complexId = deviceCourts.complex_id ?? deviceCourts.complexId;
    this.courts = deviceCourts.courts;
  }
}
