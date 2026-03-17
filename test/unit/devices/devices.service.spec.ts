import { BadRequestException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AnalysisService } from '../../../src/common/analysis.service';
import { DevicesService } from '../../../src/devices/devices.service';
import { OrderBy } from '../../../src/common/enums';
import { ErrorsService } from '../../../src/common/errors.service';
import { AuthService } from '../../../src/auth/auth.service';
import { CourtsDevicesService } from '../../../src/courts-devices/courts-devices.service';
import { DeviceStatus, DeviceType } from '../../../src/devices/enum';
import { DeviceTelemetryOrderField } from '../../../src/devices/dto';
import { PrismaService } from '../../../src/prisma/prisma.service';

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

const mockAnalysisService = {
  processAvailabilityTelemetry: jest.fn(),
  processRainTelemetry: jest.fn(),
};

const mockAuthService = {
  generateApiKey: jest.fn(),
};

const mockCourtsDevicesService = {
  getDeviceCourts: jest.fn(),
};

describe('DevicesService', () => {
  let service: DevicesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DevicesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ErrorsService, useValue: mockErrorsService },
        { provide: AnalysisService, useValue: mockAnalysisService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: CourtsDevicesService, useValue: mockCourtsDevicesService },
      ],
    }).compile();

    service = module.get<DevicesService>(DevicesService);
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

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
  });

  it('forwards type filters and ordering when loading devices', async () => {
    mockPrisma.devices.findMany.mockResolvedValue([]);

    await service.getDevices(
      2,
      { type: DeviceType.PRESENCE, orderParams: [{ field: 'id', order: 'desc' }] } as any,
      true,
    );

    expect(mockPrisma.devices.findMany).toHaveBeenCalledWith({
      where: {
        complex_id: 2,
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

  it('throws when no device is found', async () => {
    jest.spyOn(service, 'getDevices').mockResolvedValue([]);

    await expect(service.getDevice(1, 2)).rejects.toThrow(NotFoundException);
  });

  it('throws when multiple devices are found', async () => {
    jest.spyOn(service, 'getDevices').mockResolvedValue([{} as any, {} as any]);

    await expect(service.getDevice(1, 2)).rejects.toThrow(InternalServerErrorException);
  });

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

    expect(mockPrisma.devices.create).toHaveBeenCalled();
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

    await expect(service.createDevice(2, { type: DeviceType.RAIN, status: DeviceStatus.NORMAL } as any)).rejects.toThrow(
      mappedError,
    );
    expect(mockErrorsService.dbError).toHaveBeenCalledWith(error, {
      p2025: 'Device already exists.',
    });
  });

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

  it('marks the device as deleted', async () => {
    await expect(service.deleteDevice(2, 1)).resolves.toBeNull();

    expect(mockPrisma.devices.update).toHaveBeenCalled();
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

  it('stores telemetry and triggers async processing', async () => {
    mockPrisma.devices_telemetry.create.mockResolvedValue({
      value: 1.5,
      created_at: new Date(),
    });
    const processSpy = jest.spyOn(service as any, 'processDeviceTelemetry').mockResolvedValue(undefined);

    const result = await service.setDeviceTelemetry(2, 1, { value: 1.5 } as any);

    expect(processSpy).toHaveBeenCalled();
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

  it('processes presence telemetry against the first assigned court', async () => {
    jest.spyOn(service, 'getDevice').mockResolvedValue({
      id: 1,
      type: DeviceType.PRESENCE,
    } as any);
    mockCourtsDevicesService.getDeviceCourts.mockResolvedValue({
      courts: [{ id: 11 }, { id: 12 }],
    });

    await (service as any).processDeviceTelemetry(2, 1, 0, new Date('2024-06-01T10:00:00Z'));

    expect(mockAnalysisService.processAvailabilityTelemetry).toHaveBeenCalledWith(
      true,
      new Date('2024-06-01T10:00:00Z'),
      11,
    );
  });

  it('does nothing when the device has no assigned courts', async () => {
    jest.spyOn(service, 'getDevice').mockResolvedValue({
      id: 1,
      type: DeviceType.PRESENCE,
    } as any);
    mockCourtsDevicesService.getDeviceCourts.mockResolvedValue({
      courts: [],
    });

    await (service as any).processDeviceTelemetry(2, 1, 1, new Date('2024-06-01T10:00:00Z'));

    expect(mockAnalysisService.processAvailabilityTelemetry).not.toHaveBeenCalled();
    expect(mockAnalysisService.processRainTelemetry).not.toHaveBeenCalled();
  });

  it('processes rain telemetry with the previous telemetry sample when available', async () => {
    const previousTelemetry = { value: 0.5, createdAt: new Date('2024-06-01T09:55:00Z') };
    jest.spyOn(service, 'getDevice').mockResolvedValue({
      id: 1,
      type: DeviceType.RAIN,
    } as any);
    jest.spyOn(service, 'getDeviceTelemetry').mockResolvedValue({
      telemetry: [{ value: 1.2 }, previousTelemetry],
    } as any);
    mockCourtsDevicesService.getDeviceCourts.mockResolvedValue({
      courts: [{ id: 11 }, { id: 12 }],
    });

    await (service as any).processDeviceTelemetry(2, 1, 2.5, new Date('2024-06-01T10:00:00Z'));

    expect(service.getDeviceTelemetry).toHaveBeenCalledWith(2, 1, {
      orderParams: [
        {
          field: DeviceTelemetryOrderField.CREATED_AT,
          order: OrderBy.ASC,
        },
      ],
    });
    expect(mockAnalysisService.processRainTelemetry).toHaveBeenCalledWith(2, previousTelemetry, 2.5, [11, 12]);
  });

  it('processes rain telemetry with null previous telemetry when only one sample exists', async () => {
    jest.spyOn(service, 'getDevice').mockResolvedValue({
      id: 1,
      type: DeviceType.RAIN,
    } as any);
    jest.spyOn(service, 'getDeviceTelemetry').mockResolvedValue({
      telemetry: [{ value: 1.2 }],
    } as any);
    mockCourtsDevicesService.getDeviceCourts.mockResolvedValue({
      courts: [{ id: 11 }],
    });

    await (service as any).processDeviceTelemetry(2, 1, 1.5, new Date('2024-06-01T10:00:00Z'));

    expect(mockAnalysisService.processRainTelemetry).toHaveBeenCalledWith(2, null, 1.5, [11]);
  });

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

  it('updates the device status', async () => {
    mockPrisma.devices.update.mockResolvedValue({
      status: DeviceStatus.ERROR,
      updated_at: new Date('2024-06-01T10:00:00Z'),
    });

    const result = await service.setDeviceStatus(2, 1, {
      status: DeviceStatus.ERROR,
    } as any);

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
});
