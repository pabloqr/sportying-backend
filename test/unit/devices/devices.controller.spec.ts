import { Test, TestingModule } from '@nestjs/testing';
import { DevicesController } from 'src/devices/devices.controller';
import { DevicesService } from 'src/devices/devices.service';

//--------------------------------------------------------------------------------------------------------------------//
// Mock factories
//--------------------------------------------------------------------------------------------------------------------//

const mockDevicesService = {
  getDevices: jest.fn(),
  getDevice: jest.fn(),
  createDevice: jest.fn(),
  updateDevice: jest.fn(),
  deleteDevice: jest.fn(),
  getDeviceTelemetry: jest.fn(),
  setDeviceTelemetry: jest.fn(),
  getDeviceStatus: jest.fn(),
  setDeviceStatus: jest.fn(),
};

//--------------------------------------------------------------------------------------------------------------------//
// Test suite
//--------------------------------------------------------------------------------------------------------------------//

describe('DevicesController', () => {
  let controller: DevicesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DevicesController],
      providers: [{ provide: DevicesService, useValue: mockDevicesService }],
    }).compile();

    controller = module.get<DevicesController>(DevicesController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('delegates getDevices to DevicesService', async () => {
    const query = { type: 'sensor' };
    mockDevicesService.getDevices.mockResolvedValue([{ id: 1 }]);

    await expect(controller.getDevices(2, query as any)).resolves.toEqual([{ id: 1 }]);
    expect(mockDevicesService.getDevices).toHaveBeenCalledWith(2, query);
  });

  it('delegates getDevice to DevicesService', async () => {
    mockDevicesService.getDevice.mockResolvedValue({ id: 6 });

    await expect(controller.getDevice(2, 6)).resolves.toEqual({ id: 6 });
    expect(mockDevicesService.getDevice).toHaveBeenCalledWith(2, 6);
  });

  it('delegates createDevice to DevicesService', async () => {
    const dto = { name: 'Sensor' };
    mockDevicesService.createDevice.mockResolvedValue({ id: 6 });

    await expect(controller.createDevice(2, dto as any)).resolves.toEqual({
      id: 6,
    });
    expect(mockDevicesService.createDevice).toHaveBeenCalledWith(2, dto);
  });

  it('delegates updateDevice to DevicesService', async () => {
    const dto = { name: 'Updated sensor' };
    mockDevicesService.updateDevice.mockResolvedValue({ id: 6 });

    await expect(controller.updateDevice(2, 6, dto as any)).resolves.toEqual({
      id: 6,
    });
    expect(mockDevicesService.updateDevice).toHaveBeenCalledWith(2, 6, dto);
  });

  it('delegates deleteDevice to DevicesService', async () => {
    mockDevicesService.deleteDevice.mockResolvedValue(null);

    await expect(controller.deleteDevice(2, 6)).resolves.toBeNull();
    expect(mockDevicesService.deleteDevice).toHaveBeenCalledWith(2, 6);
  });

  it('delegates getDeviceTelemetry to DevicesService', async () => {
    const query = { limit: 10 };
    mockDevicesService.getDeviceTelemetry.mockResolvedValue([{ id: 1 }]);

    await expect(controller.getDeviceTelemetry(2, 6, query as any)).resolves.toEqual([{ id: 1 }]);
    expect(mockDevicesService.getDeviceTelemetry).toHaveBeenCalledWith(2, 6, query);
  });

  it('delegates setDeviceTelemetry to DevicesService', async () => {
    const dto = { temperature: 20 };
    mockDevicesService.setDeviceTelemetry.mockResolvedValue({ id: 1 });

    await expect(controller.setDeviceTelemetry(2, 6, dto as any)).resolves.toEqual({
      id: 1,
    });
    expect(mockDevicesService.setDeviceTelemetry).toHaveBeenCalledWith(2, 6, dto);
  });

  it('delegates getDeviceStatus to DevicesService', async () => {
    mockDevicesService.getDeviceStatus.mockResolvedValue({ id: 6 });

    await expect(controller.getDeviceStatus(2, 6)).resolves.toEqual({ id: 6 });
    expect(mockDevicesService.getDeviceStatus).toHaveBeenCalledWith(2, 6);
  });

  it('delegates setDeviceStatus to DevicesService', async () => {
    const dto = { battery: 98 };
    mockDevicesService.setDeviceStatus.mockResolvedValue({ id: 6 });

    await expect(controller.setDeviceStatus(2, 6, dto as any)).resolves.toEqual({
      id: 6,
    });
    expect(mockDevicesService.setDeviceStatus).toHaveBeenCalledWith(2, 6, dto);
  });
});
