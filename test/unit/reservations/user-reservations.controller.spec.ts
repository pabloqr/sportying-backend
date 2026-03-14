import { Test, TestingModule } from '@nestjs/testing';
import { ReservationsService } from '../../../src/reservations/reservations.service';
import { UserReservationsController } from '../../../src/reservations/user-reservations.controller';

const mockReservationsService = {
  getUserReservations: jest.fn(),
};

describe('UserReservationsController', () => {
  let controller: UserReservationsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserReservationsController],
      providers: [
        { provide: ReservationsService, useValue: mockReservationsService },
      ],
    }).compile();

    controller = module.get<UserReservationsController>(
      UserReservationsController,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('delegates getUserReservations to ReservationsService', async () => {
    const query = { timeFilter: 'UPCOMING' };
    mockReservationsService.getUserReservations.mockResolvedValue([{ id: 1 }]);

    await expect(controller.getUserReservations(7, query as any)).resolves.toEqual([
      { id: 1 },
    ]);
    expect(mockReservationsService.getUserReservations).toHaveBeenCalledWith(
      7,
      query,
    );
  });
});
