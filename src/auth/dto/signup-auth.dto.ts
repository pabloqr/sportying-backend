import {
  IsEmail,
  IsNotEmpty,
  IsNumber, IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class SignupAuthDto {
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
  phone_prefix: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(10000)
  phone_number: number;

  @IsString()
  @IsNotEmpty()
  password: string;
}
