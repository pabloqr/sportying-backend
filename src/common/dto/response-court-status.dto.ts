import { Type } from 'class-transformer';
import { IsDate, IsNotEmpty, IsNumber, ValidateNested } from 'class-validator';
import { CourtStatusData } from 'src/courts/dto';

export class ResponseCourtStatusDto {
  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  id: number;

  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  complexId: number;

  @Type(() => CourtStatusData)
  @ValidateNested()
  @IsNotEmpty()
  statusData: CourtStatusData;

  @IsDate()
  @IsNotEmpty()
  createdAt: Date;

  constructor(courtStatus: any) {
    this.id = courtStatus.court_id ?? courtStatus.courtId;
    this.complexId = courtStatus.complex_id ?? courtStatus.complexId;
    this.statusData = new CourtStatusData(courtStatus.status_data ?? courtStatus.statusData);
    this.createdAt = new Date(courtStatus.created_at ?? courtStatus.createdAt);
  }
}
