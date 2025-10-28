import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { Public } from 'src/auth/decorator';
import { GetUserReservationsDto } from './dto';

@Controller('users')
export class UserReservationsController {
  constructor(private reservationsService: ReservationsService) {}

  @Public()
  @Get(':userId/reservations')
  async getUserReservations(
    @Param('userId', ParseIntPipe) userId: number,
    @Query() query: GetUserReservationsDto,
  ) {
    return this.reservationsService.getUserReservations(userId, query);
  }
}
