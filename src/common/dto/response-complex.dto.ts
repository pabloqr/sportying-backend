import { Type } from 'class-transformer';
import {
  IsDate,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { Coordinates } from '../validators';

export class ResponseComplexDto {
  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  id: number;

  @IsString()
  @IsNotEmpty()
  complexName: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'Time must be in format HH:MM and valid.',
  })
  @IsNotEmpty()
  timeIni: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'Time must be in format HH:MM and valid.',
  })
  @IsNotEmpty()
  timeEnd: string;

  @Type(() => Number)
  @IsNumber()
  @Coordinates()
  @Min(-180)
  @Max(180)
  @IsOptional()
  locLongitude: number | null;

  @Type(() => Number)
  @IsNumber()
  @Coordinates()
  @Min(-90)
  @Max(90)
  @IsOptional()
  locLatitude: number | null;

  @IsDate()
  @IsNotEmpty()
  createdAt: Date;

  @IsDate()
  @IsNotEmpty()
  updatedAt: Date;

  constructor(complex: any) {
    this.id = complex.id;
    this.complexName = complex.complex_name ?? complex.complexName;
    this.timeIni = complex.time_ini ?? complex.timeIni;
    this.timeEnd = complex.time_end ?? complex.timeEnd;
    this.locLongitude = complex.loc_longitude ?? complex.locLongitude;
    this.locLatitude = complex.loc_latitude ?? complex.locLatitude;
    this.createdAt = complex.created_at ?? complex.createdAt;
    this.updatedAt = complex.updated_at ?? complex.updatedAt;
  }
}
