import { Test, TestingModule } from '@nestjs/testing';
import { CourtsDevicesController } from '../../../src/courts-devices/courts-devices.controller';
import { CourtsDevicesService } from '../../../src/courts-devices/courts-devices.service';

const mockCourtsDevicesService = {
  getCourtDevices: jest.fn(),
  getDeviceCourts: jest.fn(),
  setDeviceCourts: jest.fn(),
};

describe('CourtsDevicesController', () => {
  let controller: CourtsDevicesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CourtsDevicesController],
      providers: [
        { provide: CourtsDevicesService, useValue: mockCourtsDevicesService },
      ],
    }).compile();

    controller = module.get<CourtsDevicesController>(CourtsDevicesController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('delegates getCourtDevices to CourtsDevicesService', async () => {
    const query = { deviceId: 4 };
    mockCourtsDevicesService.getCourtDevices.mockResolvedValue([{ id: 1 }]);

    await expect(controller.getCourtDevices(2, 9, query as any)).resolves.toEqual([
      { id: 1 },
    ]);
    expect(mockCourtsDevicesService.getCourtDevices).toHaveBeenCalledWith(
      2,
      9,
      query,
    );
  });

  it('delegates getDeviceCourts to CourtsDevicesService', async () => {
    const query = { courtId: 9 };
    mockCourtsDevicesService.getDeviceCourts.mockResolvedValue([{ id: 1 }]);

    await expect(controller.getDeviceCourts(2, 4, query as any)).resolves.toEqual([
      { id: 1 },
    ]);
    expect(mockCourtsDevicesService.getDeviceCourts).toHaveBeenCalledWith(
      2,
      4,
      query,
    );
  });

  it('delegates setDeviceCourts to CourtsDevicesService', async () => {
    const dto = { courtIds: [9, 10] };
    mockCourtsDevicesService.setDeviceCourts.mockResolvedValue({ id: 4 });

    await expect(controller.setDeviceCourts(2, 4, dto as any)).resolves.toEqual({
      id: 4,
    });
    expect(mockCourtsDevicesService.setDeviceCourts).toHaveBeenCalledWith(
      2,
      4,
      dto,
    );
  });
});
