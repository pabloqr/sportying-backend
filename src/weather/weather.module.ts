import { forwardRef, Module } from '@nestjs/common';
import { ComplexesModule } from 'src/complexes/complexes.module';
import { WeatherController } from './weather.controller';
import { WeatherService } from './weather.service';

@Module({
  imports: [forwardRef(() => ComplexesModule)],
  controllers: [WeatherController],
  providers: [WeatherService],
  exports: [WeatherService],
})
export class WeatherModule { }
