import { filter, Observable, Subject } from 'rxjs';

interface NotificationEvent {
  type:
    | 'courtStatus'
    | 'reservationChange'
    | 'deviceTelemetry'
    | 'deviceStatus';
  complexId: number;
  data: any;
}

export class NotificationsSseService {
  private notificationSubject = new Subject<NotificationEvent>();

  emitCourtStatusChange(
    complexId: number,
    courtId: number,
    status: string,
    deviceId?: number,
  ) {
    this.notificationSubject.next({
      type: 'courtStatus',
      complexId,
      data: {
        courtId,
        newStatus: status,
        deviceId,
        timestamp: new Date().toISOString(),
      },
    });
  }

  emitReservationChange(
    complexId: number,
    reservationId: number,
    status: string,
  ) {
    this.notificationSubject.next({
      type: 'reservationChange',
      complexId,
      data: {
        reservationId,
        newStatus: status,
        timestamp: new Date().toISOString(),
      },
    });
  }

  emitDeviceTelemetry(complexId: number, deviceId: number, value: number) {
    this.notificationSubject.next({
      type: 'deviceTelemetry',
      complexId,
      data: {
        deviceId,
        value,
        timestamp: new Date().toISOString(),
      },
    });
  }

  getNotificationStream(complexId: number): Observable<NotificationEvent> {
    return this.notificationSubject
      .asObservable()
      .pipe(filter((event) => event.complexId === complexId));
  }
}
