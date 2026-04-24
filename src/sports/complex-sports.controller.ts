import { Controller, Get, Param, ParseIntPipe, Query, ValidationPipe } from '@nestjs/common';
import { Roles } from '../auth/decorator/index.js';
import { Role } from '../auth/enums/index.js';
import { GetSportsDto } from './dto/index.js';
import { SportsService } from './sports.service.js';

@Controller('complexes')
export class ComplexSportsController {
  constructor(private sportsService: SportsService) {}

  @Roles(Role.CLIENT, Role.ADMIN)
  @Get()
  async getComplexSports(
    @Param('complexId', ParseIntPipe) complexId: number,
    @Query(new ValidationPipe({ skipMissingProperties: true })) query: GetSportsDto,
  ) {
    return this.sportsService.getComplexSports(complexId, query);
  }
}

