import { Test, TestingModule } from '@nestjs/testing';
import { ReservationsController } from '../../../src/reservations/reservations.controller';
import { ReservationsService } from '../../../src/reservations/reservations.service';

const mockReservationsService = {
  getReservations: jest.fn(),
  getReservation: jest.fn(),
  updateReservation: jest.fn(),
  deleteReservation: jest.fn(),
};

describe('ReservationsController', () => {
  let controller: ReservationsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReservationsController],
      providers: [
        { provide: ReservationsService, useValue: mockReservationsService },
      ],
    }).compile();

    controller = module.get<ReservationsController>(ReservationsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('delegates getReservations to ReservationsService', async () => {
    const query = { userId: 7 };
    mockReservationsService.getReservations.mockResolvedValue([{ id: 1 }]);

    await expect(controller.getReservations(query as any)).resolves.toEqual([
      { id: 1 },
    ]);
    expect(mockReservationsService.getReservations).toHaveBeenCalledWith(query);
  });

  it('delegates getReservation to ReservationsService', async () => {
    mockReservationsService.getReservation.mockResolvedValue({ id: 1 });

    await expect(controller.getReservation(1)).resolves.toEqual({ id: 1 });
    expect(mockReservationsService.getReservation).toHaveBeenCalledWith(1);
  });

  it('delegates updateReservation to ReservationsService', async () => {
    const dto = { status: 'CANCELLED' };
    mockReservationsService.updateReservation.mockResolvedValue({ id: 1 });

    await expect(controller.updateReservation(1, dto as any)).resolves.toEqual({
      id: 1,
    });
    expect(mockReservationsService.updateReservation).toHaveBeenCalledWith(1, dto);
  });

  it('delegates deleteReservation to ReservationsService', async () => {
    mockReservationsService.deleteReservation.mockResolvedValue(null);

    await expect(controller.deleteReservation(1)).resolves.toBeNull();
    expect(mockReservationsService.deleteReservation).toHaveBeenCalledWith(1);
  });
});
