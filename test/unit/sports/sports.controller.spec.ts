import { Test, TestingModule } from '@nestjs/testing';
import { SportsController } from '../../../src/sports/sports.controller';
import { SportsService } from '../../../src/sports/sports.service';

const mockSportsService = {
  getSports: jest.fn(),
  getSport: jest.fn(),
};

describe('SportsController', () => {
  let controller: SportsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SportsController],
      providers: [{ provide: SportsService, useValue: mockSportsService }],
    }).compile();

    controller = module.get<SportsController>(SportsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('delegates getSports to SportsService', async () => {
    const query = { key: 'padel' };
    mockSportsService.getSports.mockResolvedValue([{ key: 'padel' }]);

    await expect(controller.getSports(query as any)).resolves.toEqual([
      { key: 'padel' },
    ]);
    expect(mockSportsService.getSports).toHaveBeenCalledWith(query);
  });

  it('delegates getSport to SportsService', async () => {
    mockSportsService.getSport.mockResolvedValue({ key: 'padel' });

    await expect(controller.getSport('padel')).resolves.toEqual({
      key: 'padel',
    });
    expect(mockSportsService.getSport).toHaveBeenCalledWith('padel');
  });
});
