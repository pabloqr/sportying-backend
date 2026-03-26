import { AuthService } from 'src/auth/auth.service';
import { ErrorsService } from 'src/common/errors.service';
import { DevicesController } from 'src/devices/devices.controller';
import { DevicesService } from 'src/devices/devices.service';
import { PrismaService } from 'src/prisma/prisma.service';
import request from 'supertest';
import {
  cleanupComplexes,
  cleanupDevices,
  createComplexRecord,
  createDeviceRecord,
  createIntegrationApp,
  resetMockUser,
} from './mock/factories';

const authServiceMock = {
  generateApiKey: jest.fn().mockResolvedValue({
    idKey: '11111111-1111-1111-1111-111111111111',
    secretKey: 'hashed-secret',
  }),
};

describe('DevicesController (integration)', () => {
  let app: Awaited<ReturnType<typeof createIntegrationApp>>['app'];
  let httpServer: any;
  let prisma: PrismaService;

  const createdComplexIds: number[] = [];
  const createdDeviceIds: number[] = [];

  beforeAll(async () => {
    const setup = await createIntegrationApp({
      controllers: [DevicesController],
      providers: [DevicesService, PrismaService, ErrorsService, { provide: AuthService, useValue: authServiceMock }],
    });

    app = setup.app;
    httpServer = setup.httpServer;
    prisma = setup.prisma!;
  });

  afterAll(async () => {
    await app?.close();
  });

  afterEach(async () => {
    await cleanupDevices(prisma, createdDeviceIds);
    await cleanupComplexes(prisma, createdComplexIds);
    resetMockUser();
    jest.clearAllMocks();
  });

  describe('GET /complexes/:complexId/devices', () => {
    it('should return an array of devices', async () => {
      const complex = await createComplexRecord(prisma, createdComplexIds);

      const response = await request(httpServer).get(`/complexes/${complex.id}/devices`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('POST /complexes/:complexId/devices', () => {
    it('should create a device', async () => {
      const complex = await createComplexRecord(prisma, createdComplexIds);

      const response = await request(httpServer)
        .post(`/complexes/${complex.id}/devices`)
        .send({ type: 'RAIN', status: 'NORMAL' });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.type).toBe('RAIN');
      createdDeviceIds.push(response.body.id);
    });
  });

  describe('GET /complexes/:complexId/devices/:deviceId/telemetry', () => {
    it('should return telemetry for a device', async () => {
      const complex = await createComplexRecord(prisma, createdComplexIds);

      const device = await createDeviceRecord(prisma, createdDeviceIds, {
        complex_id: complex.id,
        id_key: '22222222-2222-2222-2222-222222222222',
      });

      await prisma.devices_telemetry.create({
        data: {
          device_id: device.id,
          value: 12.5,
        },
      });

      const response = await request(httpServer).get(`/complexes/${complex.id}/devices/${device.id}/telemetry`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(device.id);
      expect(response.body.telemetry[0].value).toBe(12.5);
    });
  });
});
