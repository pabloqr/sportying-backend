import { Module } from '@nestjs/common';
import { CourtsStatusModule } from 'src/courts-status/courts-status.module';
import { CourtsDevicesController } from './courts-devices.controller';
import { CourtsDevicesService } from './courts-devices.service';

@Module({
  imports: [CourtsStatusModule],
  controllers: [CourtsDevicesController],
  providers: [CourtsDevicesService],
  exports: [CourtsDevicesService],
})
export class CourtsDevicesModule {}
