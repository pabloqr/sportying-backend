import {
  Controller,
  MessageEvent,
  Param,
  ParseIntPipe,
  Sse,
} from '@nestjs/common';
import { NotificationsSseService } from './notifications-sse.service';
import { map, Observable } from 'rxjs';

@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsSseService: NotificationsSseService,
  ) {}

  @Sse(':complexId')
  streamNotifications(
    @Param('complexId', ParseIntPipe) complexId: number,
  ): Observable<MessageEvent> {
    return this.notificationsSseService.getNotificationStream(complexId).pipe(
      map(
        (event): MessageEvent => ({
          type: event.type,
          data: JSON.stringify(event.data),
          id: Date.now().toString(),
          retry: 5000,
        }),
      ),
    );
  }
}
