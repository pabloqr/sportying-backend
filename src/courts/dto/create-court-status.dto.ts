import { IsEnum, IsNotEmpty } from 'class-validator';
import { Status } from '../enums';

export class CreateCourtStatusDto {
  @IsEnum(Status)
  @IsNotEmpty()
  status: Status;
}
