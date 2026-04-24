import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { Roles } from '../auth/decorator/index.js';
import { Role } from '../auth/enums/index.js';
import { CreateCourtStatusDto } from '../courts/dto/index.js';
import { CourtsStatusService } from './courts-status.service.js';

@Controller('complexes')
export class CourtsStatusController {
  constructor(private courtsStatusService: CourtsStatusService) {}

  @Roles(Role.CLIENT, Role.ADMIN)
  @Get(':complexId/courts/:courtId/status')
  async getCourtStatus(
    @Param('complexId', ParseIntPipe) complexId: number,
    @Param('courtId', ParseIntPipe) courtId: number,
  ) {
    return this.courtsStatusService.getCourtStatus(complexId, courtId);
  }

  @Roles(Role.ADMIN)
  @Post(':complexId/courts/:courtId/status')
  async setCourtStatus(
    @Param('complexId', ParseIntPipe) complexId: number,
    @Param('courtId', ParseIntPipe) courtId: number,
    @Body() dto: CreateCourtStatusDto,
  ) {
    return this.courtsStatusService.setCourtStatus(complexId, courtId, dto);
  }
}

