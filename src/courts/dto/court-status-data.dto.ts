import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty } from 'class-validator';
import { CourtStatus } from 'src/courts/enums';

export class CourtStatusData {
  @IsEnum(CourtStatus)
  @IsNotEmpty()
  status: CourtStatus;

  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  alertLevel: number;

  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  estimatedDryingTime: number;

  constructor(courtStatus: any) {
    this.status = courtStatus.status;
    this.alertLevel = courtStatus.alert_level ?? courtStatus.alertLevel;
    this.estimatedDryingTime = courtStatus.estimated_drying_time ?? courtStatus.estimatedDryingTime;
  }
}
