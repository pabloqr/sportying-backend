import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsNotEmpty, IsNumber } from 'class-validator';
import { Status } from '../../courts/enums';

export class ResponseCourtStatusDto {
  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  id: number;

  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  complexId: number;

  @IsEnum(Status)
  @IsNotEmpty()
  status: Status;

  @IsDate()
  @IsNotEmpty()
  createdAt: Date;

  constructor(courtStatus: any) {
    this.id = courtStatus.court_id;
    this.complexId = courtStatus.complex_id;
    this.status = courtStatus.status;
    this.createdAt = courtStatus.created_at;
  }
}
