import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsNotEmpty, IsNumber } from 'class-validator';
import { CourtStatus } from '../../courts/enums';

export class ResponseCourtStatusDto {
  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  id: number;

  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  complexId: number;

  @IsEnum(CourtStatus)
  @IsNotEmpty()
  status: CourtStatus;

  @IsDate()
  @IsNotEmpty()
  createdAt: Date;

  constructor(courtStatus: any) {
    this.id = courtStatus.court_id ?? courtStatus.courtId;
    this.complexId = courtStatus.complex_id ?? courtStatus.complexId;
    this.status = courtStatus.status;
    this.createdAt = courtStatus.created_at ?? courtStatus.createdAt;
  }
}
