import { Module } from '@nestjs/common';
import { ReservationsStatusService } from './reservations-status.service';

@Module({
  providers: [ReservationsStatusService]
})
export class ReservationsStatusModule { }
