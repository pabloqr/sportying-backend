import { IsArray, IsNotEmpty } from 'class-validator';

export class CreateDeviceCourtsDto {
  @IsArray()
  @IsNotEmpty()
  courts: number[];
}