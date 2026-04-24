import { IsEnum, IsNotEmpty, IsOptional } from 'class-validator';
import { DeviceStatus, DeviceType } from '../../devices/enum/index.js';

export class CreateDeviceDto {
  @IsEnum(DeviceType)
  @IsNotEmpty()
  type: DeviceType;

  @IsEnum(DeviceStatus)
  @IsOptional()
  status?: DeviceStatus;
}

