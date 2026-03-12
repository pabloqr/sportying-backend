import { Module } from '@nestjs/common';
import { CourtsDevicesModule } from '../courts-devices/court-devices.module';
import { ComplexReservationsController } from './complex-reservations.controller';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';
import { UserReservationsController } from './user-reservations.controller';

@Module({
  imports: [CourtsDevicesModule],
  controllers: [
    ReservationsController,
    UserReservationsController,
    ComplexReservationsController,
  ],
  providers: [ReservationsService],
  exports: [ReservationsService],
})
export class ReservationsModule { }
