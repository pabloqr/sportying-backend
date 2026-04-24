import { Module } from '@nestjs/common';
import { CourtsStatusModule } from '../courts-status/courts-status.module.js';
import { WeatherModule } from '../weather/weather.module.js';
import { ReservationsModule } from '../reservations/reservations.module.js';
import { CourtsController } from './courts.controller.js';
import { CourtsService } from './courts.service.js';

@Module({
  imports: [WeatherModule, CourtsStatusModule, ReservationsModule],
  controllers: [CourtsController],
  providers: [CourtsService],
  exports: [CourtsService],
})
export class CourtsModule {}

