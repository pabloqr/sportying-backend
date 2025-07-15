import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsNumber } from 'class-validator';

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
  courts: number[];

  constructor(deviceCourts: any) {
    this.id = deviceCourts.device_id ?? deviceCourts.deviceId;
    this.complexId = deviceCourts.complex_id ?? deviceCourts.complexId;
    this.courts = deviceCourts.courts;
  }
}
