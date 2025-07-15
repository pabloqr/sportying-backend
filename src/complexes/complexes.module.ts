import { Module } from '@nestjs/common';
import { ComplexesController } from './complexes.controller';
import { ComplexesService } from './complexes.service';
import { CourtsModule } from '../courts/courts.module';

@Module({
  imports: [CourtsModule],
  controllers: [ComplexesController],
  providers: [ComplexesService],
  exports: [ComplexesService],
})
export class ComplexesModule {}
