import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsNumber, ValidateNested } from 'class-validator';
import { CourtAvailabilitySlotDto } from './court-availability-slot.dto';

export class ResponseCourtAvailabilityDto {
  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  id: number;

  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  complexId: number;

  @IsArray()
  @ValidateNested({ each: true })
  @IsNotEmpty()
  availability: CourtAvailabilitySlotDto[];

  constructor(courtAvailability: any) {
    this.id = courtAvailability.court_id ?? courtAvailability.courtId;
    this.complexId =
      courtAvailability.complex_id ?? courtAvailability.complexId;
    this.availability = courtAvailability.availability;
  }
}
