import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateCourtDto } from './create-court.dto';

export class UpdateCourtDto extends PartialType(CreateCourtDto) {
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  isDelete?: boolean;
}
