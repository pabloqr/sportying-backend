import { Test, TestingModule } from '@nestjs/testing';
import { firstValueFrom, of } from 'rxjs';
import { NotificationsSseService } from '../../../src/notifications/notifications-sse.service.js';
import { NotificationsController } from '../../../src/notifications/notifications.controller.js';

//--------------------------------------------------------------------------------------------------------------------//
// Mock factories
//--------------------------------------------------------------------------------------------------------------------//

const mockNotificationsSseService = {
  getNotificationStream: jest.fn(),
};

//--------------------------------------------------------------------------------------------------------------------//
// Test suite
//--------------------------------------------------------------------------------------------------------------------//

describe('NotificationsController', () => {
  let controller: NotificationsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        {
          provide: NotificationsSseService,
          useValue: mockNotificationsSseService,
        },
      ],
    }).compile();

    controller = module.get<NotificationsController>(NotificationsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('maps notification events to SSE messages', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(123456789);
    mockNotificationsSseService.getNotificationStream.mockReturnValue(
      of({
        type: 'court-status',
        data: { courtId: 9, status: 'OPEN' },
      }),
    );

    const result = await firstValueFrom(controller.streamNotifications(2));

    expect(mockNotificationsSseService.getNotificationStream).toHaveBeenCalledWith(2);
    expect(result).toEqual({
      type: 'court-status',
      data: JSON.stringify({ courtId: 9, status: 'OPEN' }),
      id: '123456789',
      retry: 5000,
    });
  });
});
