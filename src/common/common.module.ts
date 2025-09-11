import { Global, Module } from '@nestjs/common';
import { ErrorsService } from './errors.service';
import { UtilitiesService } from './utilities.service';
import { AnalysisService } from './analysis.service';
import { CourtsModule } from '../courts/courts.module';
import { ReservationsModule } from '../reservations/reservations.module';

@Global()
@Module({
  imports: [CourtsModule, ReservationsModule],
  providers: [ErrorsService, UtilitiesService, AnalysisService],
  exports: [ErrorsService, UtilitiesService, AnalysisService],
})
export class CommonModule {}
