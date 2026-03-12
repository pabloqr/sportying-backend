import { Module } from '@nestjs/common';
import { CourtsDevicesService } from './courts-devices.service';
import { CourtsDevicesController } from './courts-devices.controller';

@Module({
  providers: [CourtsDevicesService],
  exports: [CourtsDevicesService],
  controllers: [CourtsDevicesController],
})
export class CourtsDevicesModule { }
