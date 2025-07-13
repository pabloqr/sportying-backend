import { Module } from '@nestjs/common';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';
import { UserReservationsController } from './user-reservations.controller';
import { ComplexReservationsController } from './complex-reservations.controller';
import { CourtsService } from '../courts/courts.service';
import { ComplexesService } from '../complexes/complexes.service';

@Module({
  controllers: [
    ReservationsController,
    UserReservationsController,
    ComplexReservationsController,
  ],
  providers: [ReservationsService, ComplexesService, CourtsService],
  exports: [ReservationsService],
})
export class ReservationsModule {}
