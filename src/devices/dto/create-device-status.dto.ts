import { IsEnum, IsNotEmpty } from 'class-validator';
import { DeviceStatus } from 'src/devices/enum';

export class CreateDeviceStatusDto {
  @IsEnum(DeviceStatus)
  @IsNotEmpty()
  status: DeviceStatus;
}
