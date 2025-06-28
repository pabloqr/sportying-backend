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

export class GetUsersDto {
  @IsEnum(Role)
  @IsOptional()
  role?: Role;

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
  phone_prefix?: number;

  @IsNumber()
  @IsOptional()
  @Min(10000)
  phone_number?: number;
}
