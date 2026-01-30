import { forwardRef, Module } from '@nestjs/common';
import { ComplexesModule } from 'src/complexes/complexes.module';
import { PrismaService } from 'src/prisma.service';
import { WeatherController } from './weather.controller';
import { WeatherService } from './weather.service';

@Module({
  imports: [forwardRef(() => ComplexesModule)],
  controllers: [WeatherController],
  providers: [WeatherService, PrismaService],
  exports: [WeatherService],
})
export class WeatherModule { }
