import { Module } from '@nestjs/common';
import { CourtsStatusModule } from 'src/courts-status/courts-status.module';
import { ReservationsStatusService } from './reservations-status.service';

@Module({
  imports: [CourtsStatusModule],
  providers: [ReservationsStatusService],
  exports: [ReservationsStatusService],
})
export class ReservationsStatusModule {}
