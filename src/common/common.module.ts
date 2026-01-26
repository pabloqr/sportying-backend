import { Global, Module, forwardRef } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CourtsModule } from '../courts/courts.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ReservationsModule } from '../reservations/reservations.module';
import { AnalysisService } from './analysis.service';
import { ErrorsService } from './errors.service';
import { UtilitiesService } from './utilities.service';
import { WeatherService } from './weather.service';

@Global()
@Module({
  imports: [
    forwardRef(() => CourtsModule),
    forwardRef(() => ReservationsModule),
    forwardRef(() => NotificationsModule),
  ],
  providers: [PrismaService, ErrorsService, UtilitiesService, AnalysisService, WeatherService],
  exports: [ErrorsService, UtilitiesService, AnalysisService, WeatherService],
})
export class CommonModule { }
