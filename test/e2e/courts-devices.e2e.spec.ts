import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from 'src/auth/enums';
import { PrismaService } from 'src/prisma/prisma.service';
import request from 'supertest';
import {
  cleanupComplexes,
  cleanupCourts,
  cleanupDevices,
  cleanupSports,
  cleanupUsers,
  createAuthHeader,
  createComplexRecord,
  createCourtRecord,
  createDeviceRecord,
  createE2EApp,
  createSportRecord,
} from './mock/factories';

describe('CourtsDevicesController (e2e)', () => {
  let app: INestApplication;
  let httpServer: any;
  let prisma: PrismaService;
  let jwtService: JwtService;

  const createdUserIds: number[] = [];
  const createdSportKeys: string[] = [];
  const createdComplexIds: number[] = [];
  const createdCourtIds: number[] = [];
  const createdDeviceIds: number[] = [];

  const createCourtDeviceFixture = async ({ withRelation = false }: { withRelation?: boolean } = {}) => {
    const complex = await createComplexRecord(prisma, createdComplexIds);
    const sport = await createSportRecord(prisma, createdSportKeys);
    const court = await createCourtRecord(prisma, createdCourtIds, {
      complex_id: complex.id,
      sport_key: sport.key,
      description: 'E2E court device',
      max_people: sport.max_people,
    });
    const device = await createDeviceRecord(prisma, createdDeviceIds, {
      complex_id: complex.id,
    });

    if (withRelation) {
      await prisma.courts_devices.create({
        data: {
          court_id: court.id,
          device_id: device.id,
        },
      });
    }

    return { complex, court, device };
  };

  beforeAll(async () => {
    const setup = await createE2EApp();

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
    await cleanupCourts(prisma, createdCourtIds);
    await cleanupComplexes(prisma, createdComplexIds);
    await cleanupSports(prisma, createdSportKeys);
    await cleanupUsers(prisma, createdUserIds);
  });

  describe('POST /complexes/:complexId/devices/:deviceId/courts', () => {
    it('should assign courts to a device and return the relation', async () => {
      const { authHeader } = await createAuthHeader(prisma, jwtService, createdUserIds, Role.ADMIN);
      const { complex, court, device } = await createCourtDeviceFixture();

      const response = await request(httpServer)
        .post(`/complexes/${complex.id}/devices/${device.id}/courts`)
        .set('Authorization', authHeader)
        .send({ courts: [court.id] });

      expect(response.status).toBe(201);
      expect(response.body.id).toBe(device.id);
      expect(response.body.courts).toHaveLength(1);
      expect(response.body.courts[0].id).toBe(court.id);
    });
  });

  describe('GET /complexes/:complexId/courts/:courtId/devices', () => {
    it('should return the devices assigned to a court', async () => {
      const { authHeader } = await createAuthHeader(prisma, jwtService, createdUserIds, Role.ADMIN);
      const { complex, court, device } = await createCourtDeviceFixture({ withRelation: true });

      const response = await request(httpServer)
        .get(`/complexes/${complex.id}/courts/${court.id}/devices`)
        .set('Authorization', authHeader);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(court.id);
      expect(response.body.devices).toHaveLength(1);
      expect(response.body.devices[0].id).toBe(device.id);
    });
  });
});
