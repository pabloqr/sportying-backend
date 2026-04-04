import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { Roles } from 'src/auth/decorator';
import { Role } from 'src/auth/enums';
import { ResponseComplexWeatherDto } from 'src/common/dto';
import { WeatherService } from './weather.service';

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
