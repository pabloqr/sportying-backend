import { Controller, ForbiddenException, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { GetUser, Roles } from 'src/auth/decorator';
import { Role } from 'src/auth/enums';
import { GetUserReservationsDto } from './dto';
import { ReservationsService } from './reservations.service';

@Controller('users')
export class UserReservationsController {
  constructor(private reservationsService: ReservationsService) {}

  @Roles(Role.CLIENT, Role.ADMIN)
  @Get(':userId/reservations')
  async getUserReservations(
    @Param('userId', ParseIntPipe) userId: number,
    @Query() query: GetUserReservationsDto,
    @GetUser('id') id: number,
    @GetUser('role') userRole: Role,
  ) {
    // Verificar que el usuario está autorizado
    if (userRole === Role.CLIENT && id !== userId) {
      throw new ForbiddenException('You are not allowed to access this user.');
    }

    return this.reservationsService.getUserReservations(userId, query);
  }
}
