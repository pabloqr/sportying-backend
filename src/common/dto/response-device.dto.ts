import { IsDate, IsEnum, IsNotEmpty, IsNumber } from 'class-validator';
import { DeviceType } from '../../devices/enum';

export class ResponseDeviceDto {
  @IsNumber()
  @IsNotEmpty()
  id: number;

  @IsNumber()
  @IsNotEmpty()
  complexId: number;

  @IsEnum(DeviceType)
  @IsNotEmpty()
  type: DeviceType;

  @IsDate()
  @IsNotEmpty()
  createdAt: Date;

  @IsDate()
  @IsNotEmpty()
  updatedAt: Date;

  constructor(device: any) {
    this.id = device.id;
    this.complexId = device.complex_id ?? device.complexId;
    this.type = device.type;
    this.createdAt = new Date(device.created_at ?? device.createdAt);
    this.updatedAt = new Date(device.updated_at ?? device.updatedAt);
  }
}
