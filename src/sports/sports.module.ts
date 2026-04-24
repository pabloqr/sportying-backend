import { Module } from '@nestjs/common';
import { ComplexSportsController } from './complex-sports.controller.js';
import { SportsController } from './sports.controller.js';
import { SportsService } from './sports.service.js';

@Module({
  controllers: [SportsController, ComplexSportsController],
  providers: [SportsService],
  exports: [SportsService],
})
export class SportsModule {}
