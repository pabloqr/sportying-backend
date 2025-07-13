import { Module } from '@nestjs/common';
import { ComplexesController } from './complexes.controller';
import { ComplexesService } from './complexes.service';
import { CourtsService } from '../courts/courts.service';
import { ReservationsService } from '../reservations/reservations.service';

@Module({
  controllers: [ComplexesController],
  providers: [ComplexesService, CourtsService, ReservationsService],
  exports: [ComplexesService],
})
export class ComplexesModule {}
