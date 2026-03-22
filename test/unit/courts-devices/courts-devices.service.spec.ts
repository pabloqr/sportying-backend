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
    jest.restoreAllMocks();
  });

  describe('getCourtDevices', () => {
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
      expect(mockPrisma.courts_devices.findMany).toHaveBeenCalledWith({
        where: {
          is_delete: false,
          court_id: 2,
        },
        orderBy: [],
      });
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

      const promise = service.getCourtDevices(1, 2, {});

      await expect(promise).rejects.toThrow(NotFoundException);
      await expect(promise).rejects.toThrow('Device with ID 3 not found.');
    });
  });

  describe('getDeviceCourts', () => {
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
      expect(mockPrisma.courts_devices.findMany).toHaveBeenCalledWith({
        where: {
          is_delete: false,
          device_id: 2,
        },
        orderBy: [],
      });
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

      const promise = service.getDeviceCourts(1, 2, {});

      await expect(promise).rejects.toThrow(NotFoundException);
      await expect(promise).rejects.toThrow('Court with ID 4 not found.');
    });
  });

  describe('setDeviceCourts', () => {
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

      expect(mockPrisma.courts_devices.create).toHaveBeenCalledWith({
        data: {
          court_id: 4,
          device_id: 2,
        },
      });
      expect(mockPrisma.courts_devices.update).toHaveBeenCalledWith({
        where: {
          court_id_device_id: {
            court_id: 9,
            device_id: 2,
          },
        },
        data: {
          is_delete: true,
        },
      });
      expect(result.courts[0].id).toBe(4);
    });

    it('reactivates existing relations that are still present', async () => {
      jest.spyOn(service, 'getDeviceCourts').mockResolvedValue({
        courts: [{ id: 4 } as any],
      } as any);

      const result = await service.setDeviceCourts(1, 2, { courts: [4] } as any);

      expect(mockPrisma.courts_devices.create).not.toHaveBeenCalled();
      expect(mockPrisma.courts_devices.update).toHaveBeenCalledWith({
        where: {
          court_id_device_id: {
            court_id: 4,
            device_id: 2,
          },
        },
        data: {
          is_delete: false,
        },
      });
      expect(result.courts).toEqual([{ id: 4 }]);
    });

    it('returns an empty list when no courts are provided', async () => {
      jest.spyOn(service, 'getDeviceCourts').mockResolvedValue({
        courts: [{ id: 9 } as any],
      } as any);

      const result = await service.setDeviceCourts(1, 2, { courts: [] } as any);

      expect(result).toEqual({
        id: 2,
        complexId: 1,
        courts: [],
      });
      expect(mockPrisma.courts_devices.create).not.toHaveBeenCalled();
      expect(mockPrisma.courts_devices.update).not.toHaveBeenCalled();
    });

    it('throws when a newly linked court cannot be loaded', async () => {
      jest.spyOn(service, 'getDeviceCourts').mockResolvedValue({
        courts: [],
      } as any);
      mockPrisma.courts.findUnique.mockResolvedValue(null);

      await expect(service.setDeviceCourts(1, 2, { courts: [4] } as any)).rejects.toThrow(NotFoundException);
      expect(mockErrorsService.dbError).toHaveBeenCalled();
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
});
