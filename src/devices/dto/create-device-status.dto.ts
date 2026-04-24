import { IsEnum, IsNotEmpty } from 'class-validator';
import { DeviceStatus } from '../../devices/enum/index.js';

export class CreateDeviceStatusDto {
  @IsEnum(DeviceStatus)
  @IsNotEmpty()
  status: DeviceStatus;
}

