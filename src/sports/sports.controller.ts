import { Controller, Get, Param, Query, ValidationPipe } from '@nestjs/common';
import { Roles } from '../auth/decorator/index.js';
import { Role } from '../auth/enums/index.js';
import { GetSportsDto } from './dto/get-sports.dto.js';
import { SportsService } from './sports.service.js';

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

