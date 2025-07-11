import { IsEnum, IsNotEmpty } from 'class-validator';
import { CourtStatus } from '../enums';

export class CreateCourtStatusDto {
  @IsEnum(CourtStatus)
  @IsNotEmpty()
  status: CourtStatus;
}
