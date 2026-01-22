import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CourtsDevicesService } from './courts-devices.service';

@Module({
  providers: [CourtsDevicesService, PrismaService],
  exports: [CourtsDevicesService],
})
export class CourtsDevicesModule { }
