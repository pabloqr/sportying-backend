import { Controller, Get, Param, Query, ValidationPipe } from '@nestjs/common';
import { Roles } from 'src/auth/decorator';
import { Role } from 'src/auth/enums';
import { GetSportsDto } from './dto/get-sports.dto';
import { SportsService } from './sports.service';

@Controller('config/sports')
export class SportsController {
  constructor(private sportsService: SportsService) {}

  @Roles(Role.CLIENT, Role.ADMIN)
  @Get()
  async getSports(@Query(new ValidationPipe({ skipMissingProperties: true })) query: GetSportsDto) {
    return this.sportsService.getSports(query);
  }

  @Roles(Role.CLIENT, Role.ADMIN)
  @Get(':sportKey')
  async getSport(@Param('sportKey') sportKey: string) {
    return this.sportsService.getSport(sportKey);
  }
}
