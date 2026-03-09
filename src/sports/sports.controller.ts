import { Controller, Get, Param, Query, ValidationPipe } from '@nestjs/common';
import { Public } from 'src/auth/decorator';
import { GetSportsDto } from './dto/get-sports.dto';
import { SportsService } from './sports.service';

@Controller('config/sports')
export class SportsController {
  constructor(
    private sportsService: SportsService
  ) { }

  @Public()
  @Get()
  async getSports(
    @Query(new ValidationPipe({ skipMissingProperties: true }))
    query: GetSportsDto,
  ) {
    return this.sportsService.getSports(query);
  }

  @Public()
  @Get(':sportKey')
  async getSport(@Param('sportKey') sportKey: string) {
    return this.sportsService.getSport(sportKey);
  }
}
