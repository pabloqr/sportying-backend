import { IsNotEmpty } from 'class-validator';

export class TokensDto {
  @IsNotEmpty()
  accessToken: string;

  @IsNotEmpty()
  refreshToken: string;

  constructor(tokens: TokensDto) {
    Object.assign(this, tokens);
  }
}
