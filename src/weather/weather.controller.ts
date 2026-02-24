import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { WeatherService } from './weather.service';
import { Public } from 'src/auth/decorator';

@Controller('complexes')
export class WeatherController {
  constructor(private weatherService: WeatherService) { }

  @Public()
  @Get(':complexId/weather')
  async getComplexWeather(@Param('complexId', ParseIntPipe) complexId: number) {
    return this.weatherService.getWeatherFromId(complexId);
  }
}
