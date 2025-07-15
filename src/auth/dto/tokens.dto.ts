import { IsNotEmpty, IsString } from 'class-validator';

export class TokensDto {
  @IsString()
  @IsNotEmpty()
  accessToken: string;

  @IsString()
  @IsNotEmpty()
  refreshToken: string;

  constructor(tokens: TokensDto) {
    Object.assign(this, tokens);
  }
}
