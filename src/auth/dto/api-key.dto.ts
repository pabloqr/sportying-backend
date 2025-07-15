import { IsNotEmpty, IsString } from 'class-validator';

export class ApiKeyDto {
  @IsString()
  @IsNotEmpty()
  idKey: string;

  @IsString()
  @IsNotEmpty()
  secretKey: string;

  constructor(apiKey: ApiKeyDto) {
    Object.assign(this, apiKey);
  }
}
