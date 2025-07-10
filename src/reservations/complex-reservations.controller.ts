import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { Public } from 'src/auth/decorator';
import { CreateReservationDto, GetReservationsDto } from './dto';

@Controller('complexes')
export class ComplexReservationsController {
  constructor(private reservationsService: ReservationsService) {}

  @Public()
  @Get(':complexId/reservations')
  async getComplexReservations(
    @Param('complexId', ParseIntPipe) complexId: number,
    @Query() query: GetReservationsDto,
  ) {
    return this.reservationsService.getComplexReservations(complexId, query);
  }

  @Public()
  @Post(':complexId/reservations')
  async createComplexReservation(
    @Param('complexId', ParseIntPipe) complexId: number,
    @Body() dto: CreateReservationDto,
  ) {
    return this.reservationsService.createReservation(complexId, dto);
  }
}
