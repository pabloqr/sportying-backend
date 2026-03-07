import { PartialType } from '@nestjs/mapped-types';
import { CourtStatusData } from './court-status-data.dto';

export class CreateCourtStatusDto extends PartialType(CourtStatusData) { }
