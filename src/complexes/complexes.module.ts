import { Module } from '@nestjs/common';
import { SportsModule } from '../sports/sports.module.js';
import { WeatherModule } from '../weather/weather.module.js';
import { CourtsModule } from '../courts/courts.module.js';
import { ComplexesController } from './complexes.controller.js';
import { ComplexesService } from './complexes.service.js';

@Module({
  imports: [WeatherModule, SportsModule, CourtsModule],
  controllers: [ComplexesController],
  providers: [ComplexesService],
  exports: [ComplexesService],
})
export class ComplexesModule {}

