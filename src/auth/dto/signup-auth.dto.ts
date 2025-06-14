import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class SignupAuthDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  surname: string;

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
  phone_number: number;

  @IsString()
  @IsNotEmpty()
  password: string;
}
