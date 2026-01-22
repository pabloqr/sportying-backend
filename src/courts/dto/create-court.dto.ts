import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { CourtStatus, Sport } from '../enums';

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
