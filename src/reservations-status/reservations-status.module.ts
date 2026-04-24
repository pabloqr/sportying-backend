import { Module } from '@nestjs/common';
import { CourtsStatusModule } from '../courts-status/courts-status.module.js';
import { ReservationsStatusService } from './reservations-status.service.js';

@Module({
  imports: [CourtsStatusModule],
  providers: [ReservationsStatusService],
  exports: [ReservationsStatusService],
})
export class ReservationsStatusModule {}

