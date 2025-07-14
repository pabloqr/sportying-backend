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
  GetDevicesDto,
  UpdateDeviceDto,
} from './dto';

@Controller('complexes')
export class DevicesController {
  constructor(private devicesService: DevicesService) {}

  @Public()
  @Get(':complexId/devices')
  async getDevices(
    @Param('complexId', ParseIntPipe) complexId: number,
    @Query() query: GetDevicesDto,
  ) {}

  @Public()
  @Post(':complexId/devices')
  async createDevice(
    @Param('complexId', ParseIntPipe) complexId: number,
    @Body() body: CreateDeviceDto,
  ) {}

  @Public()
  @Get(':complexId/devices/:deviceId')
  async getDevice(
    @Param('complexId', ParseIntPipe) complexId: number,
    @Param('deviceId', ParseIntPipe) deviceId: number,
  ) {}

  @Public()
  @Put(':complexId/devices/:deviceId')
  async updateDevice(
    @Param('complexId', ParseIntPipe) complexId: number,
    @Param('deviceId', ParseIntPipe) deviceId: number,
    @Body() body: UpdateDeviceDto,
  ) {}

  @Public()
  @Delete(':complexId/devices/:deviceId')
  async deleteDevice(
    @Param('complexId', ParseIntPipe) complexId: number,
    @Param('deviceId', ParseIntPipe) deviceId: number,
  ) {}

  @Public()
  @Get(':complexId/devices/:deviceId/telemetry')
  async getTelemetry(
    @Param('complexId', ParseIntPipe) complexId: number,
    @Param('deviceId', ParseIntPipe) deviceId: number,
  ) {}

  @Public()
  @UseGuards(ApiKeyGuard)
  @Post(':complexId/devices/:deviceId/telemetry')
  async postTelemetry(
    @Param('complexId', ParseIntPipe) complexId: number,
    @Param('deviceId', ParseIntPipe) deviceId: number,
    @Body() body: CreateDeviceTelemetryDto,
  ) {}

  @Public()
  @Get(':complexId/devices/:deviceId/status')
  async getStatus(
    @Param('complexId', ParseIntPipe) complexId: number,
    @Param('deviceId', ParseIntPipe) deviceId: number,
  ) {}

  @Public()
  @UseGuards(ApiKeyGuard)
  @Post(':complexId/devices/:deviceId/status')
  async postStatus(
    @Param('complexId', ParseIntPipe) complexId: number,
    @Param('deviceId', ParseIntPipe) deviceId: number,
    @Body() body: CreateDeviceStatusDto,
  ) {}

  @Public()
  @Get(':complexId/devices/:deviceId/courts')
  async getCourts(
    @Param('complexId', ParseIntPipe) complexId: number,
    @Param('deviceId', ParseIntPipe) deviceId: number,
  ) {}

  @Public()
  @Post(':complexId/devices/:deviceId/courts')
  async postCourts(
    @Param('complexId', ParseIntPipe) complexId: number,
    @Param('deviceId', ParseIntPipe) deviceId: number,
    @Body() body: CreateDeviceCourtsDto,
  ) {}
}
