import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsString,
} from 'class-validator';
import { CourtStatus, Sport } from '../../courts/enums';

export class ResponseCourtDto {
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  id: number;

  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  complexId: number;

  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  number: number;

  @IsEnum(Sport)
  @IsNotEmpty()
  sport: Sport;

  @IsString()
  @IsNotEmpty()
  description: string;

  @Type(() => Number)
  @IsInt()
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
    this.complexId = court.complex_id ?? court.complexId;
    this.number = court.number;
    this.sport = court.sport;
    this.description = court.description;
    this.maxPeople = court.max_people ?? court.maxPeople;
    this.status = court.status;
    this.createdAt = new Date(court.created_at ?? court.createdAt);
    this.updatedAt = new Date(court.updated_at ?? court.updatedAt);
  }
}
