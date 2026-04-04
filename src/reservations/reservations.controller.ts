import { Body, Controller, Delete, Get, Param, ParseIntPipe, Put, Query, ValidationPipe } from '@nestjs/common';
import { Roles } from 'src/auth/decorator';
import { Role } from 'src/auth/enums';
import { GetReservationsDto, UpdateReservationDto } from './dto';
import { ReservationsService } from './reservations.service';

@Controller('reservations')
export class ReservationsController {
  constructor(private reservationsService: ReservationsService) {}

  @Roles(Role.CLIENT)
  @Get()
  async getReservations(@Query() query: GetReservationsDto) {
    return this.reservationsService.getReservations(query);
  }

  @Roles(Role.CLIENT, Role.ADMIN)
  @Get(':reservationId')
  async getReservation(@Param('reservationId', ParseIntPipe) reservationId: number) {
    return this.reservationsService.getReservation(reservationId);
  }

  @Roles(Role.CLIENT, Role.ADMIN)
  @Put(':reservationId')
  async updateReservation(
    @Param('reservationId', ParseIntPipe) reservationId: number,
    @Body(new ValidationPipe({ skipMissingProperties: true }))
    dto: UpdateReservationDto,
  ) {
    return this.reservationsService.updateReservation(reservationId, dto);
  }

  @Roles(Role.CLIENT, Role.ADMIN)
  @Delete(':reservationId')
  async deleteReservation(@Param('reservationId', ParseIntPipe) reservationId: number) {
    return this.reservationsService.deleteReservation(reservationId);
  }
}
