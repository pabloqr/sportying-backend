import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { Sport, CourtStatus } from '../enums';

export class CreateCourtDto {
  @IsEnum(Sport)
  @IsNotEmpty()
  sport: Sport;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsNotEmpty()
  maxPeople: number;

  @IsEnum(CourtStatus)
  @IsOptional()
  status?: CourtStatus;
}
