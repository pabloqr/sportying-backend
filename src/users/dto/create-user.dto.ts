import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Role } from '../../auth/enums/role.enum';

export class CreateUserDto {
  @IsEnum(Role)
  @IsNotEmpty()
  role: Role;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  surname?: string;

  @IsEmail()
  @IsNotEmpty()
  mail: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  @Max(999)
  phonePrefix: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(10000)
  phoneNumber: number;

  @IsString()
  @IsOptional()
  password?: string;
}
