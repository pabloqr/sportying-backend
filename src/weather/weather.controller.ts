import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { Roles } from '../auth/decorator/index.js';
import { Role } from '../auth/enums/index.js';
import { ResponseComplexWeatherDto } from '../common/dto/index.js';
import { WeatherService } from './weather.service.js';

@Controller('complexes')
export class WeatherController {
  constructor(private weatherService: WeatherService) {}

  @Roles(Role.CLIENT, Role.ADMIN)
  @Get(':complexId/weather')
  async getComplexWeather(@Param('complexId', ParseIntPipe) complexId: number) {
    const weather = await this.weatherService.getWeatherFromId(complexId);

    return new ResponseComplexWeatherDto({ id: complexId, weather });
  }
}

