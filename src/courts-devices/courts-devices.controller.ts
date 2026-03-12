import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { Public } from 'src/auth/decorator';
import { GetCourtDevicesDto } from 'src/courts/dto';
import { CreateDeviceCourtsDto, GetDeviceCourtsDto } from 'src/devices/dto';
import { CourtsDevicesService } from './courts-devices.service';

@Controller('complexes')
export class CourtsDevicesController {
  constructor(
    private courtsDevicesService: CourtsDevicesService,
  ) { }

  @Public()
  @Get(':complexId/courts/:courtId/devices')
  async getCourtDevices(
    @Param('complexId', ParseIntPipe) complexId: number,
    @Param('courtId', ParseIntPipe) courtId: number,
    @Query() query: GetCourtDevicesDto,
  ) {
    return this.courtsDevicesService.getCourtDevices(
      complexId,
      courtId,
      query,
    );
  }

  @Public()
  @Get(':complexId/devices/:deviceId/courts')
  async getDeviceCourts(
    @Param('complexId', ParseIntPipe) complexId: number,
    @Param('deviceId', ParseIntPipe) deviceId: number,
    @Query() query: GetDeviceCourtsDto,
  ) {
    return this.courtsDevicesService.getDeviceCourts(
      complexId,
      deviceId,
      query,
    );
  }

  @Public()
  @Post(':complexId/devices/:deviceId/courts')
  async setDeviceCourts(
    @Param('complexId', ParseIntPipe) complexId: number,
    @Param('deviceId', ParseIntPipe) deviceId: number,
    @Body() body: CreateDeviceCourtsDto,
  ) {
    return this.courtsDevicesService.setDeviceCourts(
      complexId,
      deviceId,
      body,
    );
  }
}
