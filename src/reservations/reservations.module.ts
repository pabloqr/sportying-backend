import { forwardRef, Module } from '@nestjs/common';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';
import { UserReservationsController } from './user-reservations.controller';
import { ComplexReservationsController } from './complex-reservations.controller';
import { ComplexesService } from '../complexes/complexes.service';
import { CourtsModule } from '../courts/courts.module';
import { CourtsDevicesModule } from '../courts-devices/court-devices.module';

@Module({
  imports: [forwardRef(() => CourtsModule), CourtsDevicesModule],
  controllers: [
    ReservationsController,
    UserReservationsController,
    ComplexReservationsController,
  ],
  providers: [ReservationsService, ComplexesService],
  exports: [ReservationsService],
})
export class ReservationsModule {}
