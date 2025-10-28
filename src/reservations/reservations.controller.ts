import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Put,
  Query,
  ValidationPipe,
} from '@nestjs/common';
import { Public } from 'src/auth/decorator';
import { ReservationsService } from './reservations.service';
import { GetReservationsDto, UpdateReservationDto } from './dto';

@Controller('reservations')
export class ReservationsController {
  constructor(private reservationsService: ReservationsService) {}

  @Public()
  @Get()
  async getReservations(@Query() query: GetReservationsDto) {
    return this.reservationsService.getReservations(query);
  }

  @Public()
  @Get(':reservationId')
  async getReservation(
    @Param('reservationId', ParseIntPipe) reservationId: number,
  ) {
    return this.reservationsService.getReservation(reservationId);
  }

  @Public()
  @Put(':reservationId')
  async updateReservation(
    @Param('reservationId', ParseIntPipe) reservationId: number,
    @Body(new ValidationPipe({ skipMissingProperties: true }))
    dto: UpdateReservationDto,
  ) {
    return this.reservationsService.updateReservation(reservationId, dto);
  }

  @Public()
  @Delete(':reservationId')
  async deleteReservation(
    @Param('reservationId', ParseIntPipe) reservationId: number,
  ) {
    return this.reservationsService.deleteReservation(reservationId);
  }
}
