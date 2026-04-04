import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsSseService } from '../../../src/notifications/notifications-sse.service';
import { NotificationsService } from '../../../src/notifications/notifications.service';

//--------------------------------------------------------------------------------------------------------------------//
// Mock factories
//--------------------------------------------------------------------------------------------------------------------//

const mockNotificationsSseService = {
  emitCourtStatusChange: jest.fn(),
  emitReservationChange: jest.fn(),
  emitDeviceTelemetry: jest.fn(),
};

//--------------------------------------------------------------------------------------------------------------------//
// Test suite
//--------------------------------------------------------------------------------------------------------------------//

describe('NotificationsService', () => {
  let service: NotificationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: NotificationsSseService,
          useValue: mockNotificationsSseService,
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('delegates court status notifications to the SSE service', () => {
    service.notifyCourtStatusChange(1, 2, 'WEATHER', 3);

    expect(mockNotificationsSseService.emitCourtStatusChange).toHaveBeenCalledWith(1, 2, 'WEATHER', 3);
  });

  it('delegates reservation notifications to the SSE service', () => {
    service.notifyReservationChange(1, 2, 'CANCELLED');

    expect(mockNotificationsSseService.emitReservationChange).toHaveBeenCalledWith(1, 2, 'CANCELLED');
  });

  it('delegates device telemetry notifications to the SSE service', () => {
    service.notifyDeviceTelemetry(1, 2, 12.5);

    expect(mockNotificationsSseService.emitDeviceTelemetry).toHaveBeenCalledWith(1, 2, 12.5);
  });
});
