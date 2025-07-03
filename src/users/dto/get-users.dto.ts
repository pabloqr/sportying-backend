import {
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Role } from '../../auth/enums/role.enum';
import { Type } from 'class-transformer';

export class GetUsersDto {
  @IsEnum(Role)
  @IsOptional()
  role?: Role;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  id?: number;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  surname?: string;

  @IsString()
  @IsEmail()
  @IsOptional()
  mail?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(999)
  phonePrefix?: number;

  @IsNumber()
  @IsOptional()
  @Min(10000)
  phoneNumber?: number;
}
