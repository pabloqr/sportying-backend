import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { WeatherService } from './weather.service';
import { Public } from 'src/auth/decorator';
import { ResponseComplexWeatherDto } from 'src/common/dto';

@Controller('complexes')
export class WeatherController {
  constructor(private weatherService: WeatherService) { }

  @Public()
  @Get(':complexId/weather')
  async getComplexWeather(@Param('complexId', ParseIntPipe) complexId: number) {
    const weather = await this.weatherService.getWeatherFromId(complexId);
    
    return new ResponseComplexWeatherDto({ id: complexId, weather });
  }
}
