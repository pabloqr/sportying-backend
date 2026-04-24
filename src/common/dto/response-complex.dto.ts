import { Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Coordinates } from '../../common/validators/index.js';
import { ResponseWeatherDataDto } from './response-weater-data.dto.js';

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
  @Min(-90)
  @Max(90)
  @IsOptional()
  locLatitude: number | null;

  @Type(() => Number)
  @IsNumber()
  @Coordinates()
  @Min(-180)
  @Max(180)
  @IsOptional()
  locLongitude: number | null;

  @IsArray()
  @IsNotEmpty()
  sports: string[];

  @Type(() => ResponseWeatherDataDto)
  @ValidateNested()
  @IsNotEmpty()
  weather: ResponseWeatherDataDto;

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
    this.locLatitude = complex.loc_latitude ?? complex.locLatitude;
    this.locLongitude = complex.loc_longitude ?? complex.locLongitude;
    this.sports = complex.sports;
    this.weather = complex.weather;
    this.createdAt = new Date(complex.created_at ?? complex.createdAt);
    this.updatedAt = new Date(complex.updated_at ?? complex.updatedAt);
  }
}

