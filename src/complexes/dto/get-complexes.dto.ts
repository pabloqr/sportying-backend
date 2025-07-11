import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { Coordinates } from '../../common/validators';
import { Type } from 'class-transformer';
import { OrderBy } from '../../common/enums';

export enum ComplexOrderField {
  ID = 'id',
  COMPLEX_NAME = 'complexId',
  DATE_INI = 'dateIni',
  DATE_END = 'dateEnd',
  LOC_LONGITUDE = 'locLongitude',
  LOC_LATITUDE = 'locLatitude',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}

export const COMPLEX_ORDER_FIELD_MAP: Record<string, string> = {
  id: 'id',
  complexName: 'complex_name',
  dateIni: 'date_ini',
  dateEnd: 'date_end',
  locLongitude: 'loc_longitude',
  locLatitude: 'loc_latitude',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};

export class GetComplexesDto {
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  id?: number;

  @IsString()
  @IsOptional()
  complexName?: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'Time must be in format HH:MM and valid.',
  })
  @IsOptional()
  timeIni?: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'Time must be in format HH:MM and valid.',
  })
  @IsOptional()
  timeEnd?: string;

  @Type(() => Number)
  @IsNumber()
  @Coordinates()
  @Min(-180)
  @Max(180)
  @IsOptional()
  locLongitude?: number;

  @Type(() => Number)
  @IsNumber()
  @Coordinates()
  @Min(-90)
  @Max(90)
  @IsOptional()
  locLatitude?: number;

  @IsEnum(ComplexOrderField)
  @IsOptional()
  orderField?: ComplexOrderField = ComplexOrderField.ID;

  @IsEnum(OrderBy)
  @IsOptional()
  order?: OrderBy = OrderBy.ASC;
}
