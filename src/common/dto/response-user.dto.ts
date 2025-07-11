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

  constructor(user: any) {
    this.role = user.role;
    this.id = user.id;
    this.name = user.name;
    this.surname = user.surname;
    this.mail = user.mail;
    this.phone_prefix = user.phone_prefix ?? user.phonePrefix;
    this.phone_number = user.phone_number ?? user.phoneNumber;
    this.created_at = new Date(user.created_at ?? user.createdAt);
    this.updated_at = new Date(user.updated_at ?? user.updatedAt);
  }
}
