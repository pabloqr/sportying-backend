import { Module } from '@nestjs/common';
import { ComplexSportsController } from './complex-sports.controller';
import { SportsController } from './sports.controller';
import { SportsService } from './sports.service';

@Module({
  controllers: [SportsController, ComplexSportsController],
  providers: [SportsService],
  exports: [SportsService]
})
export class SportsModule { }
