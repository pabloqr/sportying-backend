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

  constructor(courtAvailabilitySlot: any) {
    this.dateIni =
      courtAvailabilitySlot.date_ini ?? courtAvailabilitySlot.dateIni;
    this.dateEnd =
      courtAvailabilitySlot.date_end ?? courtAvailabilitySlot.dateEnd;
    this.available = courtAvailabilitySlot.available;
  }
}
