import { Test, TestingModule } from '@nestjs/testing';
import { ComplexReservationsController } from '../../../src/reservations/complex-reservations.controller';
import { ReservationsService } from '../../../src/reservations/reservations.service';

const mockReservationsService = {
  getComplexReservations: jest.fn(),
  createReservation: jest.fn(),
};

describe('ComplexReservationsController', () => {
  let controller: ComplexReservationsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ComplexReservationsController],
      providers: [{ provide: ReservationsService, useValue: mockReservationsService }],
    }).compile();

    controller = module.get<ComplexReservationsController>(ComplexReservationsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('delegates getComplexReservations to ReservationsService', async () => {
    const query = { courtId: 9 };
    mockReservationsService.getComplexReservations.mockResolvedValue([{ id: 1 }]);

    await expect(controller.getComplexReservations(2, query as any)).resolves.toEqual([{ id: 1 }]);
    expect(mockReservationsService.getComplexReservations).toHaveBeenCalledWith(2, query);
  });

  it('delegates createComplexReservation to ReservationsService', async () => {
    const dto = { userId: 7, courtId: 9 };
    mockReservationsService.createReservation.mockResolvedValue({ id: 1 });

    await expect(controller.createComplexReservation(2, dto as any)).resolves.toEqual({
      id: 1,
    });
    expect(mockReservationsService.createReservation).toHaveBeenCalledWith(2, dto);
  });
});
