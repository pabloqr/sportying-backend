import { IsEnum, IsNotEmpty, IsOptional } from 'class-validator';
import { DeviceStatus, DeviceType } from 'src/devices/enum';

export class CreateDeviceDto {
  @IsEnum(DeviceType)
  @IsNotEmpty()
  type: DeviceType;

  @IsEnum(DeviceStatus)
  @IsOptional()
  status?: DeviceStatus;
}
