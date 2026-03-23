import { Test, TestingModule } from '@nestjs/testing';
import { CourtsStatusController } from '../../../src/courts-status/courts-status.controller';
import { CourtsStatusService } from '../../../src/courts-status/courts-status.service';

//--------------------------------------------------------------------------------------------------------------------//
// Mock factories
//--------------------------------------------------------------------------------------------------------------------//

const mockCourtsStatusService = {
  getCourtStatus: jest.fn(),
  setCourtStatus: jest.fn(),
};

//--------------------------------------------------------------------------------------------------------------------//
// Test suite
//--------------------------------------------------------------------------------------------------------------------//

describe('CourtsStatusController', () => {
  let controller: CourtsStatusController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CourtsStatusController],
      providers: [{ provide: CourtsStatusService, useValue: mockCourtsStatusService }],
    }).compile();

    controller = module.get<CourtsStatusController>(CourtsStatusController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('delegates getCourtStatus to CourtsStatusService', async () => {
    mockCourtsStatusService.getCourtStatus.mockResolvedValue({ id: 9 });

    await expect(controller.getCourtStatus(2, 9)).resolves.toEqual({ id: 9 });
    expect(mockCourtsStatusService.getCourtStatus).toHaveBeenCalledWith(2, 9);
  });

  it('delegates setCourtStatus to CourtsStatusService', async () => {
    const dto = { status: 'OPEN' };
    mockCourtsStatusService.setCourtStatus.mockResolvedValue({ id: 9 });

    await expect(controller.setCourtStatus(2, 9, dto as any)).resolves.toEqual({
      id: 9,
    });
    expect(mockCourtsStatusService.setCourtStatus).toHaveBeenCalledWith(2, 9, dto);
  });
});
