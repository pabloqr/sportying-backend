import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsString,
} from 'class-validator';
import { Sport, CourtStatus } from '../../courts/enums';

export class ResponseCourtDto {
  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  id: number;

  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  complexId: number;

  @IsEnum(Sport)
  @IsNotEmpty()
  sport: Sport;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  maxPeople: number;

  @IsEnum(CourtStatus)
  @IsNotEmpty()
  status: CourtStatus;

  @IsDate()
  @IsNotEmpty()
  createdAt: Date;

  @IsDate()
  @IsNotEmpty()
  updatedAt: Date;

  constructor(court: any) {
    this.id = court.id;
    this.complexId = court.complex_id;
    this.sport = court.sport;
    this.name = court.name;
    this.description = court.description;
    this.maxPeople = court.max_people;
    this.status = court.status;
    this.createdAt = court.created_at;
    this.updatedAt = court.updated_at;
  }
}
