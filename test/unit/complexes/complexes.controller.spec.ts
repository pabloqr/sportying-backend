import { Test, TestingModule } from '@nestjs/testing';
import { ComplexesController } from '../../../src/complexes/complexes.controller';
import { ComplexesService } from '../../../src/complexes/complexes.service';

//--------------------------------------------------------------------------------------------------------------------//
// Mock factories
//--------------------------------------------------------------------------------------------------------------------//

const mockComplexesService = {
  getComplexes: jest.fn(),
  getComplex: jest.fn(),
  createComplex: jest.fn(),
  updateComplex: jest.fn(),
  deleteComplex: jest.fn(),
  getComplexTime: jest.fn(),
  setComplexTime: jest.fn(),
  getComplexAvailability: jest.fn(),
};

//--------------------------------------------------------------------------------------------------------------------//
// Test suite
//--------------------------------------------------------------------------------------------------------------------//

describe('ComplexesController', () => {
  let controller: ComplexesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ComplexesController],
      providers: [{ provide: ComplexesService, useValue: mockComplexesService }],
    }).compile();

    controller = module.get<ComplexesController>(ComplexesController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('delegates getComplexes to ComplexesService', async () => {
    const query = { name: 'Center' };
    mockComplexesService.getComplexes.mockResolvedValue([{ id: 1 }]);

    await expect(controller.getComplexes(query as any)).resolves.toEqual([{ id: 1 }]);
    expect(mockComplexesService.getComplexes).toHaveBeenCalledWith(query);
  });

  it('delegates getComplex to ComplexesService', async () => {
    mockComplexesService.getComplex.mockResolvedValue({ id: 4 });

    await expect(controller.getComplex(4)).resolves.toEqual({ id: 4 });
    expect(mockComplexesService.getComplex).toHaveBeenCalledWith(4);
  });

  it('delegates createComplex to ComplexesService', async () => {
    const dto = { complexName: 'New Complex' };
    mockComplexesService.createComplex.mockResolvedValue({ id: 2 });

    await expect(controller.createComplex(dto as any)).resolves.toEqual({ id: 2 });
    expect(mockComplexesService.createComplex).toHaveBeenCalledWith(dto);
  });

  it('delegates updateComplex to ComplexesService', async () => {
    const dto = { complexName: 'Updated Complex' };
    mockComplexesService.updateComplex.mockResolvedValue({ id: 2 });

    await expect(controller.updateComplex(2, dto as any)).resolves.toEqual({
      id: 2,
    });
    expect(mockComplexesService.updateComplex).toHaveBeenCalledWith(2, dto);
  });

  it('delegates deleteComplex to ComplexesService', async () => {
    mockComplexesService.deleteComplex.mockResolvedValue(null);

    await expect(controller.deleteComplex(2)).resolves.toBeNull();
    expect(mockComplexesService.deleteComplex).toHaveBeenCalledWith(2);
  });

  it('delegates getComplexTime to ComplexesService', async () => {
    mockComplexesService.getComplexTime.mockResolvedValue({ id: 2 });

    await expect(controller.getComplexTime(2)).resolves.toEqual({ id: 2 });
    expect(mockComplexesService.getComplexTime).toHaveBeenCalledWith(2);
  });

  it('delegates setComplexTime to ComplexesService', async () => {
    const dto = { timeIni: '08:00', timeEnd: '22:00' };
    mockComplexesService.setComplexTime.mockResolvedValue({ id: 2 });

    await expect(controller.setComplexTime(2, dto as any)).resolves.toEqual({
      id: 2,
    });
    expect(mockComplexesService.setComplexTime).toHaveBeenCalledWith(2, dto);
  });

  it('delegates getComplexAvailability to ComplexesService', async () => {
    mockComplexesService.getComplexAvailability.mockResolvedValue({ id: 2 });

    await expect(controller.getComplexAvailability(2, false)).resolves.toEqual({
      id: 2,
    });
    expect(mockComplexesService.getComplexAvailability).toHaveBeenCalledWith(2, false);
  });
});
