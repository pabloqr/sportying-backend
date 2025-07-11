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
} from '@nestjs/common';
import { Public } from 'src/auth/decorator';
import { CourtsService } from './courts.service';
import {
  CreateCourtDto,
  CreateCourtStatusDto,
  GetCourtsDto,
  UpdateCourtDto,
} from './dto';

@Controller('complexes')
export class CourtsController {
  constructor(private courtsService: CourtsService) {}

  @Public()
  @Get(':complexId/courts')
  async getCourts(
    @Param('complexId', ParseIntPipe) complexId: number,
    @Query() query: GetCourtsDto,
  ) {
    return this.courtsService.getCourts(complexId, query);
  }

  @Public()
  @Post(':complexId/courts')
  async createCourt(
    @Param('complexId', ParseIntPipe) complexId: number,
    @Body() dto: CreateCourtDto,
  ) {
    return this.courtsService.createCourt(complexId, dto);
  }

  @Public()
  @Get(':complexId/courts/:courtId')
  async getCourt(
    @Param('complexId', ParseIntPipe) complexId: number,
    @Param('courtId', ParseIntPipe) courtId: number,
  ) {
    return this.courtsService.getCourt(complexId, courtId);
  }

  @Public()
  @Put(':complexId/courts/:courtId')
  async updateCourt(
    @Param('complexId', ParseIntPipe) complexId: number,
    @Param('courtId', ParseIntPipe) courtId: number,
    @Body() dto: UpdateCourtDto,
  ) {
    return this.courtsService.updateCourt(complexId, courtId, dto);
  }

  @Public()
  @Delete(':complexId/courts/:courtId')
  async deleteCourt(
    @Param('complexId', ParseIntPipe) complexId: number,
    @Param('courtId', ParseIntPipe) courtId: number,
  ) {
    return this.courtsService.deleteCourt(complexId, courtId);
  }

  @Public()
  @Get(':complexId/courts/:courtId/status')
  async getCourtStatus(
    @Param('complexId', ParseIntPipe) complexId: number,
    @Param('courtId', ParseIntPipe) courtId: number,
  ) {
    return this.courtsService.getCourtStatus(complexId, courtId);
  }

  @Public()
  @Post(':complexId/courts/:courtId/status')
  async setCourtStatus(
    @Param('complexId', ParseIntPipe) complexId: number,
    @Param('courtId', ParseIntPipe) courtId: number,
    @Body() dto: CreateCourtStatusDto,
  ) {
    return this.courtsService.setCourtStatus(complexId, courtId, dto);
  }

  @Public()
  @Get(':complexId/courts/:courtId/availability')
  async getCourtAvailability(
    @Param('complexId', ParseIntPipe) complexId: number,
    @Param('courtId', ParseIntPipe) courtId: number,
  ) {
    return this.courtsService.getCourtAvailability(complexId, courtId);
  }
}
