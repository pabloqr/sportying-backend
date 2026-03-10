import { Controller, Get, Param, ParseIntPipe, Query, ValidationPipe } from '@nestjs/common';
import { Public } from 'src/auth/decorator';
import { GetSportsDto } from './dto';
import { SportsService } from './sports.service';

@Controller('complexes')
export class ComplexSportsController {
  constructor(
    private sportsService: SportsService
  ) { }

  @Public()
  @Get()
  async getComplexSports(
    @Param('complexId', ParseIntPipe) complexId: number,
    @Query(new ValidationPipe({ skipMissingProperties: true })) query: GetSportsDto,
  ) {
    return this.sportsService.getComplexSports(complexId, query);
  }
}
