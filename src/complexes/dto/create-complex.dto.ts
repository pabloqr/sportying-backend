import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsString, Matches, Max, Min } from 'class-validator';
import { Coordinates } from '../../common/validators/index.js';

export class CreateComplexDto {
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
  @IsNotEmpty()
  locLatitude: number;

  @Type(() => Number)
  @IsNumber()
  @Coordinates()
  @Min(-180)
  @Max(180)
  @IsNotEmpty()
  locLongitude: number;
}

