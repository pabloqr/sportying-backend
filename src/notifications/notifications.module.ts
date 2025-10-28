import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationsSseService } from './notifications-sse.service';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsSseService, NotificationsService],
  exports: [NotificationsService]
})
export class NotificationsModule {}
