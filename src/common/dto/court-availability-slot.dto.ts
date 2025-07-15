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

  constructor(availabilitySlot: any) {
    this.dateIni = new Date(
      availabilitySlot.date_ini ?? availabilitySlot.dateIni,
    );
    this.dateEnd = new Date(
      availabilitySlot.date_end ?? availabilitySlot.dateEnd,
    );
    this.available = availabilitySlot.available;
  }
}
