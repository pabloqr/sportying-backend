import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { Sport, CourtStatus } from '../enums';

export class GetCourtsDto {
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  id?: number;

  @IsEnum(Sport)
  @IsOptional()
  sport?: Sport;

  @IsString()
  @IsOptional()
  name?: string;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  maxPeople?: number;

  @IsEnum(CourtStatus)
  @IsOptional()
  status?: CourtStatus;
}
