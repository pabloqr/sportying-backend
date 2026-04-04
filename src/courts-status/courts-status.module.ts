import { Module } from '@nestjs/common';
import { CourtsStatusController } from './courts-status.controller';
import { CourtsStatusService } from './courts-status.service';

@Module({
  controllers: [CourtsStatusController],
  providers: [CourtsStatusService],
  exports: [CourtsStatusService],
})
export class CourtsStatusModule {}
