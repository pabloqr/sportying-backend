import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ErrorsService } from '../../../src/common/errors.service';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { CourtsDevicesService } from '../../../src/courts-devices/courts-devices.service';

const mockPrisma = {
  courts_devices: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  devices: {
    findUnique: jest.fn(),
  },
  courts: {
    findUnique: jest.fn(),
  },
};

const mockErrorsService = {
  dbError: jest.fn(),
};

describe('CourtsDevicesService', () => {
  let service: CourtsDevicesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CourtsDevicesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ErrorsService, useValue: mockErrorsService },
      ],
    }).compile();

    service = module.get<CourtsDevicesService>(CourtsDevicesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns the devices linked to the court', async () => {
    mockPrisma.courts_devices.findMany.mockResolvedValue([{ device_id: 3 }]);
    mockPrisma.devices.findUnique.mockResolvedValue({
      id: 3,
      complex_id: 1,
      type: 'RAIN',
      status: 'NORMAL',
      created_at: new Date(),
      updated_at: new Date(),
    });

    const result = await service.getCourtDevices(1, 2, {});

    expect(result.devices).toHaveLength(1);
    expect(result.devices[0].id).toBe(3);
  });

  it('forwards device filters and ordering when loading court devices', async () => {
    mockPrisma.courts_devices.findMany.mockResolvedValue([]);

    await service.getCourtDevices(1, 2, { deviceId: 3, orderParams: [{ field: 'deviceId', order: 'asc' }] } as any, true);

    expect(mockPrisma.courts_devices.findMany).toHaveBeenCalledWith({
      where: {
        court_id: 2,
        device_id: 3,
      },
      orderBy: [{ device_id: 'asc' }],
    });
  });

  it('throws when a related device cannot be loaded', async () => {
    mockPrisma.courts_devices.findMany.mockResolvedValue([{ device_id: 3 }]);
    mockPrisma.devices.findUnique.mockResolvedValue(null);

    await expect(service.getCourtDevices(1, 2, {})).rejects.toThrow(NotFoundException);
  });

  it('returns the courts linked to the device', async () => {
    mockPrisma.courts_devices.findMany.mockResolvedValue([{ court_id: 4 }]);
    mockPrisma.courts.findUnique.mockResolvedValue({
      id: 4,
      complex_id: 1,
      sport_key: 'padel',
      number: 1,
      description: 'Court',
      max_people: 4,
      created_at: new Date(),
      updated_at: new Date(),
      status_data: { status: 'OPEN', alert_level: 0, estimated_drying_time: 0 },
    });

    const result = await service.getDeviceCourts(1, 2, {});

    expect(result.courts).toHaveLength(1);
    expect(result.courts[0].id).toBe(4);
  });

  it('forwards court filters and ordering when loading device courts', async () => {
    mockPrisma.courts_devices.findMany.mockResolvedValue([]);

    await service.getDeviceCourts(1, 2, { courtId: 4, orderParams: [{ field: 'courtId', order: 'desc' }] } as any, true);

    expect(mockPrisma.courts_devices.findMany).toHaveBeenCalledWith({
      where: {
        device_id: 2,
        court_id: 4,
      },
      orderBy: [{ court_id: 'desc' }],
    });
  });

  it('throws when a related court cannot be loaded', async () => {
    mockPrisma.courts_devices.findMany.mockResolvedValue([{ court_id: 4 }]);
    mockPrisma.courts.findUnique.mockResolvedValue(null);

    await expect(service.getDeviceCourts(1, 2, {})).rejects.toThrow(NotFoundException);
  });

  it('creates missing relations and disables removed ones', async () => {
    jest.spyOn(service, 'getDeviceCourts').mockResolvedValue({
      courts: [{ id: 9 } as any],
    } as any);
    mockPrisma.courts.findUnique.mockResolvedValue({
      id: 4,
      complex_id: 1,
      sport_key: 'padel',
      number: 1,
      description: 'Court',
      max_people: 4,
      created_at: new Date(),
      updated_at: new Date(),
      status_data: { status: 'OPEN', alert_level: 0, estimated_drying_time: 0 },
    });

    const result = await service.setDeviceCourts(1, 2, { courts: [4] } as any);

    expect(mockPrisma.courts_devices.create).toHaveBeenCalled();
    expect(mockPrisma.courts_devices.update).toHaveBeenCalled();
    expect(result.courts[0].id).toBe(4);
  });

  it('throws the mapped error when setDeviceCourts fails', async () => {
    const error = new Error('db');
    jest.spyOn(service, 'getDeviceCourts').mockResolvedValue({
      courts: [],
    } as any);
    mockPrisma.courts_devices.create.mockRejectedValue(error);

    await expect(service.setDeviceCourts(1, 2, { courts: [4] } as any)).rejects.toThrow(error);
    expect(mockErrorsService.dbError).toHaveBeenCalledWith(error);
  });
});
