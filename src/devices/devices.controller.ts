import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { Roles } from 'src/auth/decorator';
import { Role } from 'src/auth/enums';
import { ApiKeyGuard } from 'src/auth/guard';
import { DevicesService } from './devices.service';
import {
  CreateDeviceDto,
  CreateDeviceStatusDto,
  CreateDeviceTelemetryDto,
  GetDevicesDto,
  GetDeviceTelemetryDto,
  UpdateDeviceDto,
} from './dto';

@Controller('complexes')
export class DevicesController {
  constructor(private devicesService: DevicesService) {}

  @Roles(Role.ADMIN)
  @Get(':complexId/devices')
  async getDevices(@Param('complexId', ParseIntPipe) complexId: number, @Query() query: GetDevicesDto) {
    return this.devicesService.getDevices(complexId, query);
  }

  @Roles(Role.ADMIN)
  @Get(':complexId/devices/:deviceId')
  async getDevice(
    @Param('complexId', ParseIntPipe) complexId: number,
    @Param('deviceId', ParseIntPipe) deviceId: number,
  ) {
    return this.devicesService.getDevice(complexId, deviceId);
  }

  @Roles(Role.ADMIN)
  @Post(':complexId/devices')
  async createDevice(@Param('complexId', ParseIntPipe) complexId: number, @Body() body: CreateDeviceDto) {
    return this.devicesService.createDevice(complexId, body);
  }

  @Roles(Role.ADMIN)
  @Put(':complexId/devices/:deviceId')
  async updateDevice(
    @Param('complexId', ParseIntPipe) complexId: number,
    @Param('deviceId', ParseIntPipe) deviceId: number,
    @Body() body: UpdateDeviceDto,
  ) {
    return this.devicesService.updateDevice(complexId, deviceId, body);
  }

  @Roles(Role.ADMIN)
  @Delete(':complexId/devices/:deviceId')
  async deleteDevice(
    @Param('complexId', ParseIntPipe) complexId: number,
    @Param('deviceId', ParseIntPipe) deviceId: number,
  ) {
    return this.devicesService.deleteDevice(complexId, deviceId);
  }

  @Roles(Role.ADMIN)
  @Get(':complexId/devices/:deviceId/telemetry')
  async getDeviceTelemetry(
    @Param('complexId', ParseIntPipe) complexId: number,
    @Param('deviceId', ParseIntPipe) deviceId: number,
    @Query() query: GetDeviceTelemetryDto,
  ) {
    return this.devicesService.getDeviceTelemetry(complexId, deviceId, query);
  }

  @Roles(Role.ADMIN)
  @UseGuards(ApiKeyGuard)
  @Post(':complexId/devices/:deviceId/telemetry')
  async setDeviceTelemetry(
    @Param('complexId', ParseIntPipe) complexId: number,
    @Param('deviceId', ParseIntPipe) deviceId: number,
    @Body() body: CreateDeviceTelemetryDto,
  ) {
    return this.devicesService.setDeviceTelemetry(complexId, deviceId, body);
  }

  @Roles(Role.ADMIN)
  @Get(':complexId/devices/:deviceId/status')
  async getDeviceStatus(
    @Param('complexId', ParseIntPipe) complexId: number,
    @Param('deviceId', ParseIntPipe) deviceId: number,
  ) {
    return this.devicesService.getDeviceStatus(complexId, deviceId);
  }

  @Roles(Role.ADMIN)
  @UseGuards(ApiKeyGuard)
  @Post(':complexId/devices/:deviceId/status')
  async setDeviceStatus(
    @Param('complexId', ParseIntPipe) complexId: number,
    @Param('deviceId', ParseIntPipe) deviceId: number,
    @Body() body: CreateDeviceStatusDto,
  ) {
    return this.devicesService.setDeviceStatus(complexId, deviceId, body);
  }
}
