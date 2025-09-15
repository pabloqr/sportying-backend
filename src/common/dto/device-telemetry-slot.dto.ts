import { IsDate, IsEnum, IsNotEmpty, IsNumber } from 'class-validator';
import { DeviceType } from '../../devices/enum';

export class DeviceTelemetrySlotDto {
  @IsNumber()
  @IsNotEmpty()
  value: number;

  @IsEnum(DeviceType)
  @IsNotEmpty()
  type: DeviceType;

  @IsDate()
  @IsNotEmpty()
  createdAt: Date;

  constructor(telemetrySlot: any) {
    this.value = telemetrySlot.value;
    this.type = telemetrySlot.type;
    this.createdAt = new Date(
      telemetrySlot.created_at ?? telemetrySlot.createdAt,
    );
  }
}
