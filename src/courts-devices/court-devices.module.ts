import { Module } from '@nestjs/common';
import { CourtsDevicesService } from './courts-devices.service';
import { CourtsDevicesController } from './courts-devices.controller';

@Module({
  controllers: [CourtsDevicesController],
  providers: [CourtsDevicesService],
  exports: [CourtsDevicesService],
})
export class CourtsDevicesModule {}
