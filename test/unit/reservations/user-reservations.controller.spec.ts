import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from 'src/auth/enums';
import { ReservationsService } from '../../../src/reservations/reservations.service';
import { UserReservationsController } from '../../../src/reservations/user-reservations.controller';

//--------------------------------------------------------------------------------------------------------------------//
// Mock factories
//--------------------------------------------------------------------------------------------------------------------//

const mockReservationsService = {
  getUserReservations: jest.fn(),
};

//--------------------------------------------------------------------------------------------------------------------//
// Test suite
//--------------------------------------------------------------------------------------------------------------------//

describe('UserReservationsController', () => {
  let controller: UserReservationsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserReservationsController],
      providers: [{ provide: ReservationsService, useValue: mockReservationsService }],
    }).compile();

    controller = module.get<UserReservationsController>(UserReservationsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('delegates getUserReservations to ReservationsService', async () => {
    const query = { timeFilter: 'UPCOMING' };
    mockReservationsService.getUserReservations.mockResolvedValue([{ id: 1 }]);

    await expect(controller.getUserReservations(7, query as any, 7, Role.CLIENT)).resolves.toEqual([{ id: 1 }]);
    expect(mockReservationsService.getUserReservations).toHaveBeenCalledWith(7, query);
  });

  it('throws when a CLIENT requests another user reservations', async () => {
    const query = { timeFilter: 'UPCOMING' };

    await expect(controller.getUserReservations(7, query as any, 1, Role.CLIENT)).rejects.toThrow(
      ForbiddenException,
    );
    expect(mockReservationsService.getUserReservations).not.toHaveBeenCalled();
  });
});
