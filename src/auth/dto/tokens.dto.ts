import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class TokensDto {
  @IsString()
  @IsNotEmpty()
  accessToken: string;

  @IsString()
  @IsNotEmpty()
  refreshToken: string;

  @IsNumber()
  @IsNotEmpty()
  expiresIn: number;

  constructor(tokens: TokensDto) {
    Object.assign(this, tokens);
  }
}
