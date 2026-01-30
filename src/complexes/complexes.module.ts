import { Module, forwardRef } from '@nestjs/common';
import { WeatherModule } from 'src/weather/weather.module';
import { CourtsModule } from '../courts/courts.module';
import { ComplexesController } from './complexes.controller';
import { ComplexesService } from './complexes.service';

@Module({
  imports: [forwardRef(() => WeatherModule), forwardRef(() => CourtsModule)],
  controllers: [ComplexesController],
  providers: [ComplexesService],
  exports: [ComplexesService],
})
export class ComplexesModule { }
