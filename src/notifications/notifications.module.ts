import { Module } from '@nestjs/common';
import { NotificationsSseService } from './notifications-sse.service.js';
import { NotificationsController } from './notifications.controller.js';
import { NotificationsService } from './notifications.service.js';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsSseService, NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
