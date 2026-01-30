import { forwardRef, Module } from '@nestjs/common';
import { CourtsDevicesModule } from '../courts-devices/court-devices.module';
import { DevicesModule } from '../devices/devices.module';
import { ReservationsModule } from '../reservations/reservations.module';
import { CourtsController } from './courts.controller';
import { CourtsService } from './courts.service';

@Module({
  imports: [
    forwardRef(() => ReservationsModule),
    forwardRef(() => DevicesModule),
    CourtsDevicesModule,
  ],
  controllers: [CourtsController],
  providers: [CourtsService],
  exports: [CourtsService],
})
export class CourtsModule { }
