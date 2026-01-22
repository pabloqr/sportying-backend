import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber } from 'class-validator';

export class CreateDeviceTelemetryDto {
  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  value: number;
}
