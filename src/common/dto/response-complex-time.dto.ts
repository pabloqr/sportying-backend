import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class ResponseComplexTimeDto {
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'Time must be in format HH:MM and valid.',
  })
  @IsNotEmpty()
  timeIni: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'Time must be in format HH:MM and valid.',
  })
  @IsNotEmpty()
  timeEnd: string;

  constructor(complexTime: any) {
    this.timeIni = complexTime.time_ini ?? complexTime.timeIni;
    this.timeEnd = complexTime.time_end ?? complexTime.timeEnd;
  }
}