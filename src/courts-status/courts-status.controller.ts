import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { Roles } from 'src/auth/decorator';
import { Role } from 'src/auth/enums';
import { CreateCourtStatusDto } from 'src/courts/dto';
import { CourtsStatusService } from './courts-status.service';

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
