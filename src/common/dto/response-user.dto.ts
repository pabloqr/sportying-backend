import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Role } from '../../auth/enums/role.enum';

export class ResponseUserDto {
  @IsEnum(Role)
  @IsNotEmpty()
  role: Role;

  @IsNumber()
  @IsNotEmpty()
  id: number;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  surname: string | null;

  @IsString()
  @IsNotEmpty()
  mail: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  @Max(999)
  phone_prefix: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(10000)
  phone_number: number;

  @IsDate()
  @IsNotEmpty()
  created_at: Date;

  @IsDate()
  @IsNotEmpty()
  updated_at: Date;
}
