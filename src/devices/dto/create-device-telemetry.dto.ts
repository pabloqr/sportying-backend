import { IsNotEmpty, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDeviceTelemetryDto {
  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  value: number;
}
