import { Module } from '@nestjs/common';
import { CourtsStatusModule } from 'src/courts-status/courts-status.module';
import { WeatherModule } from 'src/weather/weather.module';
import { ReservationsModule } from 'src/reservations/reservations.module';
import { CourtsController } from './courts.controller';
import { CourtsService } from './courts.service';

@Module({
  imports: [WeatherModule, CourtsStatusModule, ReservationsModule],
  controllers: [CourtsController],
  providers: [CourtsService],
  exports: [CourtsService],
})
export class CourtsModule {}
