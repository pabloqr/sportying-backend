import { Global, Module } from '@nestjs/common';
import { CourtsStatusModule } from 'src/courts-status/courts-status.module';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { ReservationsStatusModule } from 'src/reservations-status/reservations-status.module';
import { AnalysisService } from './analysis.service';
import { ErrorsService } from './errors.service';
import { UtilitiesService } from './utilities.service';

@Global()
@Module({
  imports: [CourtsStatusModule, ReservationsStatusModule, NotificationsModule],
  providers: [ErrorsService, UtilitiesService, AnalysisService],
  exports: [ErrorsService, UtilitiesService, AnalysisService],
})
export class CommonModule { }
