import { IsBoolean, IsDate, IsNotEmpty } from 'class-validator';

export class CreateCourtAvailabilityDto {
  @IsDate()
  @IsNotEmpty()
  timeIni: Date;

  @IsDate()
  @IsNotEmpty()
  timeEnd: Date;

  @IsBoolean()
  @IsNotEmpty()
  available: boolean;
}
