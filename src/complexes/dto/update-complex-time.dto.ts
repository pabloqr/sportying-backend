import { IsOptional, IsString, Matches } from 'class-validator';

export class UpdateComplexTimeDto {
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'Time must be in format HH:MM and valid.',
  })
  @IsOptional()
  timeIni?: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'Time must be in format HH:MM and valid.',
  })
  @IsOptional()
  timeEnd?: string;
}
