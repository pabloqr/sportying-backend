import { Module } from '@nestjs/common';
import { CourtsStatusModule } from 'src/courts-status/courts-status.module';
import { ComplexReservationsController } from './complex-reservations.controller';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';
import { UserReservationsController } from './user-reservations.controller';

@Module({
  imports: [CourtsStatusModule],
  controllers: [ReservationsController, UserReservationsController, ComplexReservationsController],
  providers: [ReservationsService],
  exports: [ReservationsService],
})
export class ReservationsModule {}
