import { Global, Module } from '@nestjs/common';
import { ErrorsService } from './errors.service';

@Global()
@Module({
  providers: [ErrorsService],
  exports: [ErrorsService],
})
export class CommonModule {}
