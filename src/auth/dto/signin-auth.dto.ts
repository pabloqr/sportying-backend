import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class SigninAuthDto {
  @IsEmail()
  @IsNotEmpty()
  mail: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
