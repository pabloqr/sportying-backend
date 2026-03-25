import { randomUUID } from 'crypto';
import { ErrorsService } from 'src/common/errors.service';
import { CourtsDevicesController } from 'src/courts-devices/courts-devices.controller';
import { CourtsDevicesService } from 'src/courts-devices/courts-devices.service';
import { CourtsStatusService } from 'src/courts-status/courts-status.service';
import { PrismaService } from 'src/prisma/prisma.service';
import request from 'supertest';
import { createIntegrationApp, resetMockUser } from './mock/factories';

describe('CourtsDevicesController (integration)', () => {
  let app: Awaited<ReturnType<typeof createIntegrationApp>>['app'];
  let httpServer: any;
  let prisma: PrismaService;
  const createdCourtIds: number[] = [];
  const createdDeviceIds: number[] = [];

  const createCourtDeviceFixture = async ({ withRelation = false }: { withRelation?: boolean } = {}) => {
    const complex = await prisma.complexes.findFirst({ where: { is_delete: false } });
    const sport = await prisma.sports.findFirst({ where: { is_delete: false } });
    expect(complex).toBeDefined();
    expect(sport).toBeDefined();

    const court = await prisma.courts.create({
      data: {
        complex_id: complex!.id,
        sport_key: sport!.key,
        number: Math.floor(1000 + Math.random() * 1000),
        description: 'Integration court device',
        max_people: sport!.max_people,
      },
    });
    createdCourtIds.push(court.id);

    const device = await prisma.devices.create({
      data: {
        complex_id: complex!.id,
        id_key: randomUUID(),
        api_key: 'hashed-secret',
        type: 'RAIN',
        status: 'NORMAL',
      },
    });
    createdDeviceIds.push(device.id);

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
    if (createdDeviceIds.length > 0 || createdCourtIds.length > 0) {
      await prisma.courts_devices.deleteMany({
        where: {
          OR: [{ device_id: { in: createdDeviceIds } }, { court_id: { in: createdCourtIds } }],
        },
      });
    }

    if (createdDeviceIds.length > 0) {
      await prisma.devices.deleteMany({ where: { id: { in: createdDeviceIds } } });
      createdDeviceIds.length = 0;
    }

    if (createdCourtIds.length > 0) {
      await prisma.courts_status.deleteMany({ where: { court_id: { in: createdCourtIds } } });
      await prisma.courts.deleteMany({ where: { id: { in: createdCourtIds } } });
      createdCourtIds.length = 0;
    }

    resetMockUser();
  });

  describe('POST /complexes/:complexId/devices/:deviceId/courts', () => {
    it('should assign courts to a device and return the relation', async () => {
      const { complex, court, device } = await createCourtDeviceFixture();

      const response = await request(httpServer)
        .post(`/complexes/${complex!.id}/devices/${device.id}/courts`)
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

      const response = await request(httpServer).get(`/complexes/${complex!.id}/courts/${court.id}/devices`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(court.id);
      expect(response.body.devices).toHaveLength(1);
      expect(response.body.devices[0].id).toBe(device.id);
    });
  });
});
