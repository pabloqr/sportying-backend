import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from 'src/auth/auth.service';
import { Role } from 'src/auth/enums';
import { PrismaService } from 'src/prisma/prisma.service';
import request from 'supertest';
import {
  cleanupComplexes,
  cleanupDevices,
  cleanupUsers,
  createAuthHeader,
  createComplexRecord,
  createDeviceRecord,
  createE2EApp,
} from './mock/factories';

const authServiceMock = {
  generateApiKey: jest.fn().mockResolvedValue({
    idKey: '11111111-1111-1111-1111-111111111111',
    secretKey: 'hashed-secret',
  }),
};

describe('DevicesController (e2e)', () => {
  let app: INestApplication;
  let httpServer: any;
  let prisma: PrismaService;
  let jwtService: JwtService;

  const createdUserIds: number[] = [];
  const createdComplexIds: number[] = [];
  const createdDeviceIds: number[] = [];

  beforeAll(async () => {
    const setup = await createE2EApp([{ provide: AuthService, useValue: authServiceMock }]);

    app = setup.app;
    httpServer = setup.httpServer;
    prisma = setup.prisma;
    jwtService = setup.jwtService;
  });

  afterAll(async () => {
    await app?.close();
  });

  afterEach(async () => {
    await cleanupDevices(prisma, createdDeviceIds);
    await cleanupComplexes(prisma, createdComplexIds);
    await cleanupUsers(prisma, createdUserIds);
    jest.clearAllMocks();
  });

  describe('GET /complexes/:complexId/devices', () => {
    it('should return an array of devices', async () => {
      const { authHeader } = await createAuthHeader(prisma, jwtService, createdUserIds, Role.ADMIN);
      const complex = await createComplexRecord(prisma, createdComplexIds);

      const response = await request(httpServer)
        .get(`/complexes/${complex.id}/devices`)
        .set('Authorization', authHeader);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('POST /complexes/:complexId/devices', () => {
    it('should create a device', async () => {
      const { authHeader } = await createAuthHeader(prisma, jwtService, createdUserIds, Role.ADMIN);
      const complex = await createComplexRecord(prisma, createdComplexIds);

      const response = await request(httpServer)
        .post(`/complexes/${complex.id}/devices`)
        .set('Authorization', authHeader)
        .send({ type: 'RAIN', status: 'NORMAL' });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.type).toBe('RAIN');
      createdDeviceIds.push(response.body.id);
    });
  });

  describe('GET /complexes/:complexId/devices/:deviceId/telemetry', () => {
    it('should return telemetry for a device', async () => {
      const { authHeader } = await createAuthHeader(prisma, jwtService, createdUserIds, Role.ADMIN);
      const complex = await createComplexRecord(prisma, createdComplexIds);

      const device = await createDeviceRecord(prisma, createdDeviceIds, {
        complex_id: complex.id,
      });

      await prisma.devices_telemetry.create({
        data: {
          device_id: device.id,
          value: 12.5,
        },
      });

      const response = await request(httpServer)
        .get(`/complexes/${complex.id}/devices/${device.id}/telemetry`)
        .set('Authorization', authHeader);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(device.id);
      expect(response.body.telemetry[0].value).toBe(12.5);
    });
  });
});
