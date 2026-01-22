import { forwardRef, Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { ComplexesService } from '../complexes/complexes.service';
import { CourtsDevicesModule } from '../courts-devices/court-devices.module';
import { CourtsModule } from '../courts/courts.module';
import { ComplexReservationsController } from './complex-reservations.controller';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';
import { UserReservationsController } from './user-reservations.controller';

@Module({
  imports: [forwardRef(() => CourtsModule), CourtsDevicesModule],
  controllers: [
    ReservationsController,
    UserReservationsController,
    ComplexReservationsController,
  ],
  providers: [ReservationsService, PrismaService, ComplexesService],
  exports: [ReservationsService],
})
export class ReservationsModule { }
