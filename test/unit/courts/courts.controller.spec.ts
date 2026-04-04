import { Test, TestingModule } from '@nestjs/testing';
import { CourtsController } from '../../../src/courts/courts.controller';
import { CourtsService } from '../../../src/courts/courts.service';

//--------------------------------------------------------------------------------------------------------------------//
// Mock factories
//--------------------------------------------------------------------------------------------------------------------//

const mockCourtsService = {
  getCourts: jest.fn(),
  getCourt: jest.fn(),
  createCourt: jest.fn(),
  updateCourt: jest.fn(),
  deleteCourt: jest.fn(),
  getCourtAvailability: jest.fn(),
};

//--------------------------------------------------------------------------------------------------------------------//
// Test suite
//--------------------------------------------------------------------------------------------------------------------//

describe('CourtsController', () => {
  let controller: CourtsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CourtsController],
      providers: [{ provide: CourtsService, useValue: mockCourtsService }],
    }).compile();

    controller = module.get<CourtsController>(CourtsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('delegates getCourts to CourtsService', async () => {
    const query = { sportKey: 'padel' };
    mockCourtsService.getCourts.mockResolvedValue([{ id: 1 }]);

    await expect(controller.getCourts(2, query as any)).resolves.toEqual([{ id: 1 }]);
    expect(mockCourtsService.getCourts).toHaveBeenCalledWith(2, query);
  });

  it('delegates getCourt to CourtsService', async () => {
    mockCourtsService.getCourt.mockResolvedValue({ id: 5 });

    await expect(controller.getCourt(2, 5)).resolves.toEqual({ id: 5 });
    expect(mockCourtsService.getCourt).toHaveBeenCalledWith(2, 5);
  });

  it('delegates createCourt to CourtsService', async () => {
    const dto = { number: 1 };
    mockCourtsService.createCourt.mockResolvedValue({ id: 5 });

    await expect(controller.createCourt(2, dto as any)).resolves.toEqual({
      id: 5,
    });
    expect(mockCourtsService.createCourt).toHaveBeenCalledWith(2, dto);
  });

  it('delegates updateCourt to CourtsService', async () => {
    const dto = { description: 'Updated court' };
    mockCourtsService.updateCourt.mockResolvedValue({ id: 5 });

    await expect(controller.updateCourt(2, 5, dto as any)).resolves.toEqual({
      id: 5,
    });
    expect(mockCourtsService.updateCourt).toHaveBeenCalledWith(2, 5, dto);
  });

  it('delegates deleteCourt to CourtsService', async () => {
    mockCourtsService.deleteCourt.mockResolvedValue(null);

    await expect(controller.deleteCourt(2, 5)).resolves.toBeNull();
    expect(mockCourtsService.deleteCourt).toHaveBeenCalledWith(2, 5);
  });

  it('delegates getCourtAvailability to CourtsService', async () => {
    mockCourtsService.getCourtAvailability.mockResolvedValue({ id: 5 });

    await expect(controller.getCourtAvailability(2, 5, false)).resolves.toEqual({
      id: 5,
    });
    expect(mockCourtsService.getCourtAvailability).toHaveBeenCalledWith(2, 5, false);
  });
});
