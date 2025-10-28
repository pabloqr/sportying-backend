import { forwardRef, Module } from '@nestjs/common';
import { CourtsController } from './courts.controller';
import { CourtsService } from './courts.service';
import { ReservationsModule } from '../reservations/reservations.module';
import { CourtsDevicesModule } from '../courts-devices/court-devices.module';
import { DevicesModule } from '../devices/devices.module';

@Module({
  imports: [
    CourtsDevicesModule,
    forwardRef(() => ReservationsModule),
    forwardRef(() => DevicesModule),
  ],
  controllers: [CourtsController],
  providers: [CourtsService],
  exports: [CourtsService],
})
export class CourtsModule {}
