import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { CourtStatus, Sport } from '../enums';
import { OrderBy } from '../../common/enums';

export enum CourtOrderField {
  ID = 'id',
  SPORT = 'sport',
  NAME = 'name',
  MAX_PEOPLE = 'maxPeople',
  STATUS = 'status',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}

export const COURT_ORDER_FIELD_MAP: Record<string, string> = {
  id: 'id',
  sport: 'sport',
  name: 'name',
  maxPeople: 'max_people',
  status: 'status',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};

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

  @IsEnum(CourtOrderField)
  @IsOptional()
  orderField?: CourtOrderField = CourtOrderField.ID;

  @IsEnum(OrderBy)
  @IsOptional()
  order?: OrderBy = OrderBy.ASC;
}
