import { Test, TestingModule } from '@nestjs/testing';
import { firstValueFrom, take, timeout } from 'rxjs';
import { NotificationsSseService } from '../../../src/notifications/notifications-sse.service.js';

//--------------------------------------------------------------------------------------------------------------------//
// Test suite
//--------------------------------------------------------------------------------------------------------------------//

describe('NotificationsSseService', () => {
  let service: NotificationsSseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationsSseService],
    }).compile();

    service = module.get<NotificationsSseService>(NotificationsSseService);
  });

  it('emits court status change events for the matching complex stream', async () => {
    const eventPromise = firstValueFrom(service.getNotificationStream(10).pipe(take(1), timeout(100)));

    service.emitCourtStatusChange(10, 4, 'WEATHER', 9);

    await expect(eventPromise).resolves.toMatchObject({
      type: 'courtStatus',
      complexId: 10,
      data: {
        courtId: 4,
        newStatus: 'WEATHER',
        deviceId: 9,
      },
    });
  });

  it('filters out notifications from other complexes', async () => {
    const eventPromise = firstValueFrom(service.getNotificationStream(10).pipe(take(1), timeout(50)));

    service.emitReservationChange(99, 3, 'CANCELLED');

    await expect(eventPromise).rejects.toBeTruthy();
  });
});
