import { Module } from '@nestjs/common';
import { CourtsController } from './courts.controller';
import { CourtsService } from './courts.service';
import { ReservationsService } from '../reservations/reservations.service';

@Module({
  controllers: [CourtsController],
  providers: [CourtsService, ReservationsService],
  exports: [CourtsService],
})
export class CourtsModule {}
