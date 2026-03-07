import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested
} from 'class-validator';
import { Sport } from '../enums';
import { CourtStatusData } from './court-status-data.dto';

class CreateCourtStatusDataDto extends PartialType(CourtStatusData) { }

export class CreateCourtDto {
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  number?: number;

  @IsEnum(Sport)
  @IsNotEmpty()
  sport: Sport;

  @IsString()
  @IsOptional()
  description?: string;

  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  maxPeople: number;

  @Type(() => CreateCourtStatusDataDto)
  @ValidateNested()
  @IsOptional()
  statusData?: CreateCourtStatusDataDto;
}
