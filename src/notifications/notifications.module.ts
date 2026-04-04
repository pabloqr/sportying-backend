import { Module } from '@nestjs/common';
import { NotificationsSseService } from './notifications-sse.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsSseService, NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
