import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsNumber, ValidateNested } from 'class-validator';
import { DeviceTelemetrySlotDto } from './device-telemetry-slot.dto';

export class ResponseDeviceTelemetryDto {
  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  id: number;

  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  complexId: number;

  @IsArray()
  @ValidateNested({ each: true })
  @IsNotEmpty()
  telemetry: DeviceTelemetrySlotDto[];

  constructor(courtStatus: any) {
    this.id = courtStatus.device_id ?? courtStatus.deviceId;
    this.complexId = courtStatus.complex_id ?? courtStatus.complexId;
    this.telemetry = courtStatus.telemetry;
  }
}
