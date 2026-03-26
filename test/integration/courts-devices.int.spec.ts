import { ErrorsService } from 'src/common/errors.service';
import { CourtsDevicesController } from 'src/courts-devices/courts-devices.controller';
import { CourtsDevicesService } from 'src/courts-devices/courts-devices.service';
import { CourtsStatusService } from 'src/courts-status/courts-status.service';
import { PrismaService } from 'src/prisma/prisma.service';
import request from 'supertest';
import {
  cleanupComplexes,
  cleanupCourts,
  cleanupDevices,
  cleanupSports,
  createComplexRecord,
  createCourtRecord,
  createDeviceRecord,
  createIntegrationApp,
  createSportRecord,
  resetMockUser,
} from './mock/factories';

describe('CourtsDevicesController (integration)', () => {
  let app: Awaited<ReturnType<typeof createIntegrationApp>>['app'];
  let httpServer: any;
  let prisma: PrismaService;

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
      description: 'Integration court device',
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
    const setup = await createIntegrationApp({
      controllers: [CourtsDevicesController],
      providers: [CourtsDevicesService, PrismaService, ErrorsService, CourtsStatusService],
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
    await cleanupCourts(prisma, createdCourtIds);
    await cleanupComplexes(prisma, createdComplexIds);
    await cleanupSports(prisma, createdSportKeys);
    resetMockUser();
  });

  describe('POST /complexes/:complexId/devices/:deviceId/courts', () => {
    it('should assign courts to a device and return the relation', async () => {
      const { complex, court, device } = await createCourtDeviceFixture();

      const response = await request(httpServer)
        .post(`/complexes/${complex.id}/devices/${device.id}/courts`)
        .send({ courts: [court.id] });

      expect(response.status).toBe(201);
      expect(response.body.id).toBe(device.id);
      expect(response.body.courts).toHaveLength(1);
      expect(response.body.courts[0].id).toBe(court.id);
    });
  });

  describe('GET /complexes/:complexId/courts/:courtId/devices', () => {
    it('should return the devices assigned to a court', async () => {
      const { complex, court, device } = await createCourtDeviceFixture({ withRelation: true });

      const response = await request(httpServer).get(`/complexes/${complex.id}/courts/${court.id}/devices`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(court.id);
      expect(response.body.devices).toHaveLength(1);
      expect(response.body.devices[0].id).toBe(device.id);
    });
  });
});
