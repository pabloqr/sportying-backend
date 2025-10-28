import { Module } from '@nestjs/common';
import { CourtsDevicesService } from './courts-devices.service';

@Module({
  providers: [CourtsDevicesService],
  exports: [CourtsDevicesService],
})
export class CourtsDevicesModule {}
