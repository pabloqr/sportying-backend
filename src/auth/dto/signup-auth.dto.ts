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
  phonePrefix: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(10000)
  phoneNumber: number;

  @IsString()
  @IsNotEmpty()
  password: string;
}
