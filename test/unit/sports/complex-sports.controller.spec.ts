import { Test, TestingModule } from '@nestjs/testing';
import { ComplexSportsController } from '../../../src/sports/complex-sports.controller';
import { SportsService } from '../../../src/sports/sports.service';

//--------------------------------------------------------------------------------------------------------------------//
// Mock factories
//--------------------------------------------------------------------------------------------------------------------//

const mockSportsService = {
  getComplexSports: jest.fn(),
};

//--------------------------------------------------------------------------------------------------------------------//
// Test suite
//--------------------------------------------------------------------------------------------------------------------//

describe('ComplexSportsController', () => {
  let controller: ComplexSportsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ComplexSportsController],
      providers: [{ provide: SportsService, useValue: mockSportsService }],
    }).compile();

    controller = module.get<ComplexSportsController>(ComplexSportsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('delegates getComplexSports to SportsService', async () => {
    const query = { key: 'padel' };
    mockSportsService.getComplexSports.mockResolvedValue([{ key: 'padel' }]);

    await expect(controller.getComplexSports(3, query as any)).resolves.toEqual([{ key: 'padel' }]);
    expect(mockSportsService.getComplexSports).toHaveBeenCalledWith(3, query);
  });
});
