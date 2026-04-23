import { BadRequestException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from 'src/auth/auth.service';
import { ErrorsService } from 'src/common/errors.service';
import { DevicesService } from 'src/devices/devices.service';
import { DeviceStatus, DeviceType } from 'src/devices/enum';
import { PrismaService } from 'src/prisma/prisma.service';

//--------------------------------------------------------------------------------------------------------------------//
// Mock factories
//--------------------------------------------------------------------------------------------------------------------//

const mockPrisma = {
  devices: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  devices_telemetry: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
};

const mockErrorsService = {
  noBodyError: jest.fn(),
  dbError: jest.fn(),
};

const mockAuthService = {
  generateApiKey: jest.fn(),
};

//--------------------------------------------------------------------------------------------------------------------//
// Test suite
//--------------------------------------------------------------------------------------------------------------------//

describe('DevicesService', () => {
  let service: DevicesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DevicesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ErrorsService, useValue: mockErrorsService },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    service = module.get<DevicesService>(DevicesService);
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  describe('getDevices', () => {
    it('returns active devices by default', async () => {
      mockPrisma.devices.findMany.mockResolvedValue([
        {
          id: 1,
          complex_id: 2,
          type: DeviceType.RAIN,
          status: DeviceStatus.NORMAL,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]);

      const result = await service.getDevices(2, {});

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe(DeviceType.RAIN);
      expect(mockPrisma.devices.findMany).toHaveBeenCalledWith({
        where: {
          is_delete: false,
          complex_id: 2,
        },
        select: {
          id: true,
          complex_id: true,
          type: true,
          status: true,
          created_at: true,
          updated_at: true,
        },
        orderBy: [],
      });
    });

    it('forwards filters and ordering when loading devices', async () => {
      mockPrisma.devices.findMany.mockResolvedValue([]);

      await service.getDevices(
        2,
        {
          id: 9,
          type: DeviceType.PRESENCE,
          orderParams: [{ field: 'id', order: 'desc' }],
        } as any,
        true,
      );

      expect(mockPrisma.devices.findMany).toHaveBeenCalledWith({
        where: {
          complex_id: 2,
          id: 9,
          type: DeviceType.PRESENCE,
        },
        select: {
          id: true,
          complex_id: true,
          type: true,
          status: true,
          created_at: true,
          updated_at: true,
        },
        orderBy: [{ id: 'desc' }],
      });
    });
  });

  describe('getDevice', () => {
    it('throws when no device is found', async () => {
      jest.spyOn(service, 'getDevices').mockResolvedValue([]);

      await expect(service.getDevice(1, 2)).rejects.toThrow(NotFoundException);
    });

    it('throws when multiple devices are found', async () => {
      jest.spyOn(service, 'getDevices').mockResolvedValue([{} as any, {} as any]);

      await expect(service.getDevice(1, 2)).rejects.toThrow(InternalServerErrorException);
    });

    it('returns the matching device when exactly one result is found', async () => {
      const device = {
        id: 2,
        complexId: 1,
        type: DeviceType.RAIN,
        status: DeviceStatus.NORMAL,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      jest.spyOn(service, 'getDevices').mockResolvedValue([device as any]);

      await expect(service.getDevice(1, 2)).resolves.toEqual(device);
      expect(service.getDevices).toHaveBeenCalledWith(1, { id: 2 });
    });
  });

  describe('createDevice', () => {
    it('creates a device with a generated api key', async () => {
      mockAuthService.generateApiKey.mockResolvedValue({
        idKey: 'id-key',
        secretKey: 'secret-key',
      });
      mockPrisma.devices.create.mockResolvedValue({
        id: 1,
        complex_id: 2,
        type: DeviceType.RAIN,
        status: DeviceStatus.NORMAL,
        created_at: new Date(),
        updated_at: new Date(),
      });

      const result = await service.createDevice(2, {
        type: DeviceType.RAIN,
        status: DeviceStatus.NORMAL,
      } as any);

      expect(mockAuthService.generateApiKey).toHaveBeenCalled();
      expect(mockPrisma.devices.create).toHaveBeenCalledWith({
        data: {
          id_key: 'id-key',
          api_key: 'secret-key',
          complex_id: 2,
          type: DeviceType.RAIN,
          status: DeviceStatus.NORMAL,
        },
        select: {
          id: true,
          complex_id: true,
          type: true,
          status: true,
          created_at: true,
          updated_at: true,
        },
      });
      expect(result.id).toBe(1);
    });

    it('throws the mapped error when createDevice fails', async () => {
      const error = new Error('db');
      const mappedError = new NotFoundException('Device already exists.');
      mockAuthService.generateApiKey.mockResolvedValue({
        idKey: 'id-key',
        secretKey: 'secret-key',
      });
      mockPrisma.devices.create.mockRejectedValue(error);
      mockErrorsService.dbError.mockImplementationOnce(() => {
        throw mappedError;
      });

      await expect(
        service.createDevice(2, { type: DeviceType.RAIN, status: DeviceStatus.NORMAL } as any),
      ).rejects.toThrow(mappedError);
      expect(mockErrorsService.dbError).toHaveBeenCalledWith(error, {
        p2025: 'Device already exists.',
      });
    });

    it('rethrows the original error when createDevice fails with a non-mapped error', async () => {
      const error = new Error('db');
      mockAuthService.generateApiKey.mockResolvedValue({
        idKey: 'id-key',
        secretKey: 'secret-key',
      });
      mockPrisma.devices.create.mockRejectedValue(error);

      await expect(service.createDevice(2, { type: DeviceType.RAIN, status: DeviceStatus.NORMAL } as any)).rejects.toBe(
        error,
      );
    });
  });

  describe('updateDevice', () => {
    it('updates the device and returns the dto', async () => {
      mockPrisma.devices.update.mockResolvedValue({
        id: 1,
        complex_id: 2,
        type: DeviceType.PRESENCE,
        status: DeviceStatus.BATTERY,
        created_at: new Date(),
        updated_at: new Date(),
      });

      const result = await service.updateDevice(2, 1, {
        type: DeviceType.PRESENCE,
        status: DeviceStatus.BATTERY,
      } as any);

      expect(mockErrorsService.noBodyError).toHaveBeenCalled();
      expect(mockPrisma.devices.update).toHaveBeenCalledWith({
        where: {
          id: 1,
          complex_id: 2,
          is_delete: false,
        },
        data: expect.objectContaining({
          type: DeviceType.PRESENCE,
          status: DeviceStatus.BATTERY,
        }),
        select: {
          id: true,
          complex_id: true,
          type: true,
          status: true,
          created_at: true,
          updated_at: true,
        },
      });
      expect(result.status).toBe(DeviceStatus.BATTERY);
    });

    it('throws when updateDevice receives no body', async () => {
      const bodyError = new BadRequestException('No properties to update.');
      mockErrorsService.noBodyError.mockImplementationOnce(() => {
        throw bodyError;
      });

      await expect(service.updateDevice(2, 1, undefined as any)).rejects.toThrow(bodyError);
      expect(mockPrisma.devices.update).not.toHaveBeenCalled();
    });

    it('throws the mapped error when updateDevice fails', async () => {
      const error = new Error('db');
      const mappedError = new NotFoundException('Device with ID 1 not found.');
      mockPrisma.devices.update.mockRejectedValue(error);
      mockErrorsService.dbError.mockImplementationOnce(() => {
        throw mappedError;
      });

      await expect(
        service.updateDevice(2, 1, {
          type: DeviceType.PRESENCE,
          status: DeviceStatus.BATTERY,
        } as any),
      ).rejects.toThrow(mappedError);
      expect(mockErrorsService.dbError).toHaveBeenCalledWith(error, {
        p2025: 'Device with ID 1 not found.',
      });
    });

    it('rethrows the original error when updateDevice fails with a non-mapped error', async () => {
      const error = new Error('db');
      mockPrisma.devices.update.mockRejectedValue(error);

      await expect(
        service.updateDevice(2, 1, {
          type: DeviceType.PRESENCE,
          status: DeviceStatus.BATTERY,
        } as any),
      ).rejects.toBe(error);
    });
  });

  describe('deleteDevice', () => {
    it('marks the device as deleted', async () => {
      await expect(service.deleteDevice(2, 1)).resolves.toBeNull();

      expect(mockPrisma.devices.update).toHaveBeenCalledWith({
        where: { id: 1, complex_id: 2 },
        data: expect.objectContaining({ is_delete: true }),
      });
    });

    it('throws the mapped error when deleteDevice fails', async () => {
      const error = new Error('db');
      const mappedError = new NotFoundException('Device with ID 1 not found.');
      mockPrisma.devices.update.mockRejectedValue(error);
      mockErrorsService.dbError.mockImplementationOnce(() => {
        throw mappedError;
      });

      await expect(service.deleteDevice(2, 1)).rejects.toThrow(mappedError);
      expect(mockErrorsService.dbError).toHaveBeenCalledWith(error, {
        p2025: 'Device with ID 1 not found.',
      });
    });

    it('rethrows the original error when deleteDevice fails with a non-mapped error', async () => {
      const error = new Error('db');
      mockPrisma.devices.update.mockRejectedValue(error);

      await expect(service.deleteDevice(2, 1)).rejects.toBe(error);
    });
  });

  describe('getDeviceTelemetry', () => {
    it('returns telemetry mapped with the device type', async () => {
      jest.spyOn(service, 'getDevice').mockResolvedValue({
        id: 1,
        complexId: 2,
        type: DeviceType.RAIN,
      } as any);
      mockPrisma.devices_telemetry.findMany.mockResolvedValue([{ value: 1.5, created_at: new Date() }]);

      const result = await service.getDeviceTelemetry(2, 1, {});

      expect(result.telemetry).toHaveLength(1);
      expect(result.telemetry[0].type).toBe(DeviceType.RAIN);
      expect(mockPrisma.devices_telemetry.findMany).toHaveBeenCalledWith({
        where: { device_id: 1 },
        orderBy: [{ created_at: 'desc' }],
      });
    });

    it('forwards telemetry filters and ordering', async () => {
      jest.spyOn(service, 'getDevice').mockResolvedValue({
        id: 1,
        complexId: 2,
        type: DeviceType.RAIN,
      } as any);
      mockPrisma.devices_telemetry.findMany.mockResolvedValue([]);

      await service.getDeviceTelemetry(2, 1, {
        minValue: 0.2,
        maxValue: 0.9,
        orderParams: [{ field: 'createdAt', order: 'asc' }],
      } as any);

      expect(mockPrisma.devices_telemetry.findMany).toHaveBeenCalledWith({
        where: {
          device_id: 1,
          value: {
            lt: 0.9,
          },
        },
        orderBy: [{ created_at: 'asc' }],
      });
    });

    it('uses default descending order and take=1 when requesting the last telemetry sample', async () => {
      jest.spyOn(service, 'getDevice').mockResolvedValue({
        id: 1,
        complexId: 2,
        type: DeviceType.RAIN,
      } as any);
      mockPrisma.devices_telemetry.findMany.mockResolvedValue([]);

      await service.getDeviceTelemetry(2, 1, { last: true } as any);

      expect(mockPrisma.devices_telemetry.findMany).toHaveBeenCalledWith({
        where: { device_id: 1 },
        orderBy: [{ created_at: 'desc' }],
        take: 1,
      });
    });
  });

  describe('setDeviceTelemetry', () => {
    it('stores telemetry and returns it in the response', async () => {
      mockPrisma.devices_telemetry.create.mockResolvedValue({
        value: 1.5,
        created_at: new Date(),
      });

      const result = await service.setDeviceTelemetry(2, 1, { value: 1.5 } as any);

      expect(mockPrisma.devices_telemetry.create).toHaveBeenCalledWith({
        data: {
          device_id: 1,
          value: 1.5,
        },
      });
      expect(result.telemetry).toHaveLength(1);
    });

    it('throws the mapped error when storing telemetry fails', async () => {
      const error = new Error('db');
      const mappedError = new NotFoundException('Device with ID 1 not found.');
      mockPrisma.devices_telemetry.create.mockRejectedValue(error);
      mockErrorsService.dbError.mockImplementationOnce(() => {
        throw mappedError;
      });

      await expect(service.setDeviceTelemetry(2, 1, { value: 1.5 } as any)).rejects.toThrow(mappedError);
      expect(mockErrorsService.dbError).toHaveBeenCalledWith(error, {
        p2025: 'Device with ID 1 not found.',
      });
    });

    it('rethrows the original error when storing telemetry fails with a non-mapped error', async () => {
      const error = new Error('db');
      mockPrisma.devices_telemetry.create.mockRejectedValue(error);

      await expect(service.setDeviceTelemetry(2, 1, { value: 1.5 } as any)).rejects.toBe(error);
    });
  });

  describe('getDeviceStatus', () => {
    it('returns the device status dto from getDeviceStatus', async () => {
      jest.spyOn(service, 'getDevice').mockResolvedValue({
        id: 1,
        complexId: 2,
        status: DeviceStatus.NORMAL,
        updatedAt: new Date('2024-06-01T10:00:00Z'),
      } as any);

      const result = await service.getDeviceStatus(2, 1);

      expect(result.id).toBe(1);
      expect(result.status).toBe(DeviceStatus.NORMAL);
    });
  });

  describe('setDeviceStatus', () => {
    it('updates the device status', async () => {
      mockPrisma.devices.update.mockResolvedValue({
        status: DeviceStatus.ERROR,
        updated_at: new Date('2024-06-01T10:00:00Z'),
      });

      const result = await service.setDeviceStatus(2, 1, {
        status: DeviceStatus.ERROR,
      } as any);

      expect(mockPrisma.devices.update).toHaveBeenCalledWith({
        where: {
          id: 1,
        },
        data: {
          status: DeviceStatus.ERROR,
          updated_at: expect.any(Date),
        },
        select: {
          status: true,
          updated_at: true,
        },
      });
      expect(result.status).toBe(DeviceStatus.ERROR);
    });

    it('throws the mapped error when updating device status fails', async () => {
      const error = new Error('db');
      const mappedError = new NotFoundException('Device with ID 1 not found.');
      mockPrisma.devices.update.mockRejectedValue(error);
      mockErrorsService.dbError.mockImplementationOnce(() => {
        throw mappedError;
      });

      await expect(service.setDeviceStatus(2, 1, { status: DeviceStatus.ERROR } as any)).rejects.toThrow(mappedError);
      expect(mockErrorsService.dbError).toHaveBeenCalledWith(error, {
        p2025: 'Device with ID 1 not found.',
      });
    });

    it('rethrows the original error when updating device status fails with a non-mapped error', async () => {
      const error = new Error('db');
      mockPrisma.devices.update.mockRejectedValue(error);

      await expect(service.setDeviceStatus(2, 1, { status: DeviceStatus.ERROR } as any)).rejects.toBe(error);
    });
  });
});
