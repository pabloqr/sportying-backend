import { Global, Module } from '@nestjs/common';
import { ErrorsService } from './errors.service';
import { UtilitiesService } from './utilities.service';
import { AnalysisService } from './analysis.service';
import { CourtsModule } from '../courts/courts.module';

@Global()
@Module({
  imports: [CourtsModule],
  providers: [ErrorsService, UtilitiesService, AnalysisService],
  exports: [ErrorsService, UtilitiesService, AnalysisService],
})
export class CommonModule {}
