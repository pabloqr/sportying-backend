import { Injectable } from '@nestjs/common';
import { NotificationsSseService } from './notifications-sse.service';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly notificationsSseService: NotificationsSseService,
  ) {}

  notifyCourtStatusChange(
    complexId: number,
    courtId: number,
    newStatus: string,
    deviceId?: number,
  ) {
    this.notificationsSseService.emitCourtStatusChange(
      complexId,
      courtId,
      newStatus,
      deviceId,
    );
  }

  notifyReservationChange(
    complexId: number,
    reservationId: number,
    newStatus: string,
  ) {
    this.notificationsSseService.emitReservationChange(
      complexId,
      reservationId,
      newStatus,
    );
  }

  notifyDeviceTelemetry(complexId: number, deviceId: number, value: number) {
    this.notificationsSseService.emitDeviceTelemetry(
      complexId,
      deviceId,
      value,
    );
  }
}
