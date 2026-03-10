import { forwardRef, Module } from '@nestjs/common';
import { ComplexSportsController } from './complex-sports.controller';
import { SportsController } from './sports.controller';
import { SportsService } from './sports.service';
import { CourtsModule } from 'src/courts/courts.module';

@Module({
  imports: [forwardRef(() => CourtsModule)],
  controllers: [SportsController, ComplexSportsController],
  providers: [SportsService],
  exports: [SportsService]
})
export class SportsModule { }
