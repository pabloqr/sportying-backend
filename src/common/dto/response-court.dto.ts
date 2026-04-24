import { Type } from 'class-transformer';
import { IsDate, IsInt, IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { CourtStatusData } from '../../courts/dto/index.js';
import { ResponseWeatherDataDto } from './response-weater-data.dto.js';

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

  @IsString()
  @IsNotEmpty()
  sportKey: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  maxPeople: number;

  @Type(() => CourtStatusData)
  @ValidateNested()
  @IsNotEmpty()
  statusData: CourtStatusData;

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

  constructor(court: any) {
    this.id = court.id;
    this.complexId = court.complex_id ?? court.complexId;
    this.number = court.number;
    this.sportKey = court.sport_key ?? court.sportKey;
    this.description = court.description;
    this.maxPeople = court.max_people ?? court.maxPeople;
    this.statusData = new CourtStatusData(court.status_data ?? court.statusData);
    this.weather = court.weather;
    this.createdAt = new Date(court.created_at ?? court.createdAt);
    this.updatedAt = new Date(court.updated_at ?? court.updatedAt);
  }
}

