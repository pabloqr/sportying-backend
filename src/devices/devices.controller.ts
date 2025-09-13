import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DevicesService } from './devices.service';
import { ApiKeyGuard } from '../auth/guard';
import { Public } from 'src/auth/decorator';
import {
  CreateDeviceCourtsDto,
  CreateDeviceDto,
  CreateDeviceStatusDto,
  CreateDeviceTelemetryDto,
  GetDeviceCourtsDto,
  GetDevicesDto,
  GetDeviceTelemetryDto,
  UpdateDeviceDto,
} from './dto';
import { CourtsService } from '../courts/courts.service';

@Controller('complexes')
export class DevicesController {
  constructor(
    private devicesService: DevicesService,
    private courtsService: CourtsService,
  ) {}

  @Public()
  @Get(':complexId/devices')
  async getDevices(
    @Param('complexId', ParseIntPipe) complexId: number,
    @Query() query: GetDevicesDto,
  ) {
    return this.devicesService.getDevices(complexId, query);
  }

  @Public()
  @Get(':complexId/devices/:deviceId')
  async getDevice(
    @Param('complexId', ParseIntPipe) complexId: number,
    @Param('deviceId', ParseIntPipe) deviceId: number,
  ) {
    return this.devicesService.getDevice(complexId, deviceId);
  }

  @Public()
  @Post(':complexId/devices')
  async createDevice(
    @Param('complexId', ParseIntPipe) complexId: number,
    @Body() body: CreateDeviceDto,
  ) {
    return this.devicesService.createDevice(complexId, body);
  }

  @Public()
  @Put(':complexId/devices/:deviceId')
  async updateDevice(
    @Param('complexId', ParseIntPipe) complexId: number,
    @Param('deviceId', ParseIntPipe) deviceId: number,
    @Body() body: UpdateDeviceDto,
  ) {
    return this.devicesService.updateDevice(complexId, deviceId, body);
  }

  @Public()
  @Delete(':complexId/devices/:deviceId')
  async deleteDevice(
    @Param('complexId', ParseIntPipe) complexId: number,
    @Param('deviceId', ParseIntPipe) deviceId: number,
  ) {
    return this.devicesService.deleteDevice(complexId, deviceId);
  }

  @Public()
  @Get(':complexId/devices/:deviceId/telemetry')
  async getDeviceTelemetry(
    @Param('complexId', ParseIntPipe) complexId: number,
    @Param('deviceId', ParseIntPipe) deviceId: number,
    @Query() query: GetDeviceTelemetryDto,
  ) {
    return this.devicesService.getDeviceTelemetry(complexId, deviceId, query);
  }

  @Public()
  @UseGuards(ApiKeyGuard)
  @Post(':complexId/devices/:deviceId/telemetry')
  async setDeviceTelemetry(
    @Param('complexId', ParseIntPipe) complexId: number,
    @Param('deviceId', ParseIntPipe) deviceId: number,
    @Body() body: CreateDeviceTelemetryDto,
  ) {
    return this.devicesService.setDeviceTelemetry(
      complexId,
      deviceId,
      body,
      this.courtsService.getCourt.bind(this.courtsService),
    );
  }

  @Public()
  @Get(':complexId/devices/:deviceId/status')
  async getDeviceStatus(
    @Param('complexId', ParseIntPipe) complexId: number,
    @Param('deviceId', ParseIntPipe) deviceId: number,
  ) {
    return this.devicesService.getDeviceStatus(complexId, deviceId);
  }

  @Public()
  @UseGuards(ApiKeyGuard)
  @Post(':complexId/devices/:deviceId/status')
  async setDeviceStatus(
    @Param('complexId', ParseIntPipe) complexId: number,
    @Param('deviceId', ParseIntPipe) deviceId: number,
    @Body() body: CreateDeviceStatusDto,
  ) {
    return this.devicesService.setDeviceStatus(complexId, deviceId, body);
  }

  @Public()
  @Get(':complexId/devices/:deviceId/courts')
  async getDeviceCourts(
    @Param('complexId', ParseIntPipe) complexId: number,
    @Param('deviceId', ParseIntPipe) deviceId: number,
    @Query() query: GetDeviceCourtsDto,
  ) {
    return this.devicesService.getDeviceCourts(
      complexId,
      deviceId,
      query,
      this.courtsService.getCourt.bind(this.courtsService),
    );
  }

  @Public()
  @Post(':complexId/devices/:deviceId/courts')
  async setDeviceCourts(
    @Param('complexId', ParseIntPipe) complexId: number,
    @Param('deviceId', ParseIntPipe) deviceId: number,
    @Body() body: CreateDeviceCourtsDto,
  ) {
    return this.devicesService.setDeviceCourts(
      complexId,
      deviceId,
      body,
      this.courtsService.getCourt.bind(this.courtsService),
    );
  }
}
