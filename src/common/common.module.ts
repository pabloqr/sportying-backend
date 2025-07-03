import { Global, Module } from '@nestjs/common';
import { ErrorsService } from './errors.service';
import { UtilitiesService } from './utilities.service';

@Global()
@Module({
  providers: [ErrorsService, UtilitiesService],
  exports: [ErrorsService, UtilitiesService],
})
export class CommonModule {}
