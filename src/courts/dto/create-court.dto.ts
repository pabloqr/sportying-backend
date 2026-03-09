import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested
} from 'class-validator';
import { CourtStatusData } from './court-status-data.dto';

class CreateCourtStatusDataDto extends PartialType(CourtStatusData) { }

export class CreateCourtDto {
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  number?: number;

  @IsString()
  @IsNotEmpty()
  sportKey: string;

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
