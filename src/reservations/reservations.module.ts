import { forwardRef, Module } from '@nestjs/common';
import { ComplexesModule } from 'src/complexes/complexes.module';
import { CourtsDevicesModule } from '../courts-devices/court-devices.module';
import { ComplexReservationsController } from './complex-reservations.controller';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';
import { UserReservationsController } from './user-reservations.controller';

@Module({
  imports: [forwardRef(() => ComplexesModule), CourtsDevicesModule],
  controllers: [
    ReservationsController,
    UserReservationsController,
    ComplexReservationsController,
  ],
  providers: [ReservationsService],
  exports: [ReservationsService],
})
export class ReservationsModule { }
