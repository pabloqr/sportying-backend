import { Module } from '@nestjs/common';
import { CourtsStatusModule } from '../courts-status/courts-status.module.js';
import { CourtsDevicesController } from './courts-devices.controller.js';
import { CourtsDevicesService } from './courts-devices.service.js';

@Module({
  imports: [CourtsStatusModule],
  controllers: [CourtsDevicesController],
  providers: [CourtsDevicesService],
  exports: [CourtsDevicesService],
})
export class CourtsDevicesModule {}

