import { forwardRef, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CourtsDevicesModule } from '../courts-devices/court-devices.module';
import { CourtsModule } from '../courts/courts.module';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';

@Module({
  imports: [forwardRef(() => AuthModule), CourtsDevicesModule, forwardRef(() => CourtsModule)],
  controllers: [DevicesController],
  providers: [DevicesService],
  exports: [DevicesService],
})
export class DevicesModule { }
