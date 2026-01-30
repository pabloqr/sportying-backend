import { forwardRef, Module } from '@nestjs/common';
import { ComplexesModule } from 'src/complexes/complexes.module';
import { PrismaService } from 'src/prisma.service';
import { CourtsDevicesModule } from '../courts-devices/court-devices.module';
import { CourtsModule } from '../courts/courts.module';
import { ComplexReservationsController } from './complex-reservations.controller';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';
import { UserReservationsController } from './user-reservations.controller';

@Module({
  imports: [forwardRef(() => ComplexesModule), forwardRef(() => CourtsModule), CourtsDevicesModule],
  controllers: [
    ReservationsController,
    UserReservationsController,
    ComplexReservationsController,
  ],
  providers: [ReservationsService, PrismaService],
  exports: [ReservationsService],
})
export class ReservationsModule { }
