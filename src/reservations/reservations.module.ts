import { Module } from '@nestjs/common';
import { CourtsStatusModule } from '../courts-status/courts-status.module.js';
import { ComplexReservationsController } from './complex-reservations.controller.js';
import { ReservationsController } from './reservations.controller.js';
import { ReservationsService } from './reservations.service.js';
import { UserReservationsController } from './user-reservations.controller.js';

@Module({
  imports: [CourtsStatusModule],
  controllers: [ReservationsController, UserReservationsController, ComplexReservationsController],
  providers: [ReservationsService],
  exports: [ReservationsService],
})
export class ReservationsModule {}

