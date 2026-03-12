import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CourtsDevicesModule } from '../courts-devices/court-devices.module';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';

@Module({
  imports: [AuthModule, CourtsDevicesModule],
  controllers: [DevicesController],
  providers: [DevicesService],
  exports: [DevicesService],
})
export class DevicesModule { }
