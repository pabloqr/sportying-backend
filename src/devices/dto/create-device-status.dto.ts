import { IsEnum, IsNotEmpty } from 'class-validator';
import { DeviceStatus } from '../enum';

export class CreateDeviceStatusDto {
  @IsEnum(DeviceStatus)
  @IsNotEmpty()
  status: DeviceStatus;
}
