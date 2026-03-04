import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString
} from 'class-validator';
import { CourtStatus, Sport } from '../enums';

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

  @IsEnum(CourtStatus)
  @IsOptional()
  status?: CourtStatus;
}
