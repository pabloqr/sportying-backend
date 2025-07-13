import { Module } from '@nestjs/common';
import { CourtsController } from './courts.controller';
import { CourtsService } from './courts.service';
import { ReservationsService } from '../reservations/reservations.service';
import { ComplexesService } from '../complexes/complexes.service';

@Module({
  controllers: [CourtsController],
  providers: [CourtsService, ComplexesService, ReservationsService],
  exports: [CourtsService],
})
export class CourtsModule {}
