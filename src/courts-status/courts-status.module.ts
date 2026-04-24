import { Module } from '@nestjs/common';
import { CourtsStatusController } from './courts-status.controller.js';
import { CourtsStatusService } from './courts-status.service.js';

@Module({
  controllers: [CourtsStatusController],
  providers: [CourtsStatusService],
  exports: [CourtsStatusService],
})
export class CourtsStatusModule {}
