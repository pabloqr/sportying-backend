import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsNotEmpty, IsNumber } from 'class-validator';
import { DeviceStatus } from '../../devices/enum';

export class ResponseDeviceStatusDto {
  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  id: number;

  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  complexId: number;

  @IsEnum(DeviceStatus)
  @IsNotEmpty()
  status: DeviceStatus;

  @IsDate()
  @IsNotEmpty()
  createdAt: Date;

  constructor(courtStatus: any) {
    this.id = courtStatus.device_id ?? courtStatus.deviceId;
    this.complexId = courtStatus.complex_id ?? courtStatus.complexId;
    this.status = courtStatus.status;
    this.createdAt = new Date(courtStatus.created_at ?? courtStatus.createdAt);
  }
}
