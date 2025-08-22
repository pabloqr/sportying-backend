import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;

  constructor(token: RefreshTokenDto) {
    Object.assign(this, token);
  }
}