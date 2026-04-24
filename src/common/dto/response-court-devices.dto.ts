import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsNumber } from 'class-validator';
import { ResponseDeviceDto } from './response-device.dto.js';

export class ResponseCourtDevicesDto {
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
  devices: ResponseDeviceDto[];

  constructor(courtDevices: any) {
    this.id = courtDevices.court_id ?? courtDevices.courtId;
    this.complexId = courtDevices.complex_id ?? courtDevices.complexId;
    this.devices = courtDevices.devices;
  }
}
