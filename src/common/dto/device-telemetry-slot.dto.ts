import { IsDate, IsNotEmpty, IsNumber } from 'class-validator';

export class DeviceTelemetrySlotDto {
  @IsNumber()
  @IsNotEmpty()
  value: number;

  @IsDate()
  @IsNotEmpty()
  createdAt: Date;

  constructor(telemetrySlot: any) {
    this.value = telemetrySlot.value;
    this.createdAt = new Date(
      telemetrySlot.created_at ?? telemetrySlot.createdAt,
    );
  }
}
