import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
import { Roles } from 'src/auth/decorator';
import { Role } from 'src/auth/enums';
import { CourtsService } from './courts.service';
import { CreateCourtDto, GetCourtsDto, UpdateCourtDto } from './dto';

@Controller('complexes')
export class CourtsController {
  constructor(private courtsService: CourtsService) {}

  @Roles(Role.CLIENT, Role.ADMIN)
  @Get(':complexId/courts')
  async getCourts(@Param('complexId', ParseIntPipe) complexId: number, @Query() query: GetCourtsDto) {
    return this.courtsService.getCourts(complexId, query);
  }

  @Roles(Role.CLIENT, Role.ADMIN)
  @Get(':complexId/courts/:courtId')
  async getCourt(@Param('complexId', ParseIntPipe) complexId: number, @Param('courtId', ParseIntPipe) courtId: number) {
    return this.courtsService.getCourt(complexId, courtId);
  }

  @Roles(Role.ADMIN)
  @Post(':complexId/courts')
  async createCourt(@Param('complexId', ParseIntPipe) complexId: number, @Body() dto: CreateCourtDto) {
    return this.courtsService.createCourt(complexId, dto);
  }

  @Roles(Role.ADMIN)
  @Put(':complexId/courts/:courtId')
  async updateCourt(
    @Param('complexId', ParseIntPipe) complexId: number,
    @Param('courtId', ParseIntPipe) courtId: number,
    @Body() dto: UpdateCourtDto,
  ) {
    return this.courtsService.updateCourt(complexId, courtId, dto);
  }

  @Roles(Role.ADMIN)
  @Delete(':complexId/courts/:courtId')
  async deleteCourt(
    @Param('complexId', ParseIntPipe) complexId: number,
    @Param('courtId', ParseIntPipe) courtId: number,
  ) {
    return this.courtsService.deleteCourt(complexId, courtId);
  }

  @Roles(Role.CLIENT, Role.ADMIN)
  @Get(':complexId/courts/:courtId/availability')
  async getCourtAvailability(
    @Param('complexId', ParseIntPipe) complexId: number,
    @Param('courtId', ParseIntPipe) courtId: number,
    @Query('groupAvailability') groupAvailability: boolean = true,
  ) {
    return this.courtsService.getCourtAvailability(complexId, courtId, groupAvailability);
  }
}
