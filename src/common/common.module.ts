import { Global, Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { ReservationsStatusModule } from '../reservations-status/reservations-status.module.js';
import { AnalysisService } from './analysis.service.js';
import { ErrorsService } from './errors.service.js';
import { UtilitiesService } from './utilities.service.js';

@Global()
@Module({
  imports: [ReservationsStatusModule, NotificationsModule],
  providers: [ErrorsService, UtilitiesService, AnalysisService],
  exports: [ErrorsService, UtilitiesService, AnalysisService],
})
export class CommonModule {}

