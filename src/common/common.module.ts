import { Global, Module, forwardRef } from '@nestjs/common';
import { CourtsModule } from '../courts/courts.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ReservationsModule } from '../reservations/reservations.module';
import { AnalysisService } from './analysis.service';
import { ErrorsService } from './errors.service';
import { UtilitiesService } from './utilities.service';

@Global()
@Module({
  imports: [
    forwardRef(() => CourtsModule),
    forwardRef(() => ReservationsModule),
    forwardRef(() => NotificationsModule),
  ],
  providers: [ErrorsService, UtilitiesService, AnalysisService],
  exports: [ErrorsService, UtilitiesService, AnalysisService],
})
export class CommonModule { }
