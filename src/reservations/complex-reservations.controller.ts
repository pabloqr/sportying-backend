import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { Roles } from '../auth/decorator/index.js';
import { Role } from '../auth/enums/index.js';
import { CreateReservationDto, GetReservationsDto } from './dto/index.js';
import { ReservationsService } from './reservations.service.js';

@Controller('complexes')
export class ComplexReservationsController {
  constructor(private reservationsService: ReservationsService) {}

  @Roles(Role.CLIENT, Role.ADMIN)
  @Get(':complexId/reservations')
  async getComplexReservations(
    @Param('complexId', ParseIntPipe) complexId: number,
    @Query() query: GetReservationsDto,
  ) {
    return this.reservationsService.getComplexReservations(complexId, query);
  }

  @Roles(Role.CLIENT, Role.ADMIN)
  @Post(':complexId/reservations')
  async createComplexReservation(
    @Param('complexId', ParseIntPipe) complexId: number,
    @Body() dto: CreateReservationDto,
  ) {
    return this.reservationsService.createReservation(complexId, dto);
  }
}

