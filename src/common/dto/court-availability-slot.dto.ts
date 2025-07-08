import { IsBoolean, IsDate, IsNotEmpty } from 'class-validator';

export class CourtAvailabilitySlotDto {
  @IsDate()
  @IsNotEmpty()
  dateIni: Date;

  @IsDate()
  @IsNotEmpty()
  dateEnd: Date;

  @IsBoolean()
  @IsNotEmpty()
  available: boolean;
}
