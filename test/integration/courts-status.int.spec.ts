import { Role } from 'src/auth/enums';
import { ErrorsService } from 'src/common/errors.service';
import { CourtsStatusController } from 'src/courts-status/courts-status.controller';
import { CourtsStatusService } from 'src/courts-status/courts-status.service';
import { PrismaService } from 'src/prisma/prisma.service';
import request from 'supertest';
import { createIntegrationApp, mockUser, resetMockUser } from './mock/factories';

describe('CourtsStatusController (integration)', () => {
  let app: Awaited<ReturnType<typeof createIntegrationApp>>['app'];
  let httpServer: any;
  let prisma: PrismaService;
  const touchedCourtIds = new Set<number>();

  beforeAll(async () => {
    const setup = await createIntegrationApp({
      controllers: [CourtsStatusController],
      providers: [CourtsStatusService, PrismaService, ErrorsService],
    });

    app = setup.app;
    httpServer = setup.httpServer;
    prisma = setup.prisma!;
  });

  afterAll(async () => {
    await app?.close();
  });

  afterEach(async () => {
    if (touchedCourtIds.size > 0) {
      await prisma.courts_status.deleteMany({
        where: {
          court_id: { in: Array.from(touchedCourtIds) },
        },
      });
      touchedCourtIds.clear();
    }

    resetMockUser();
  });

  describe('GET /complexes/:complexId/courts/:courtId/status', () => {
    it('should return the default OPEN status when no status exists', async () => {
      const court = await prisma.courts.findFirst({ where: { is_delete: false } });
      expect(court).toBeDefined();

      const response = await request(httpServer).get(`/complexes/${court!.complex_id}/courts/${court!.id}/status`);

      expect(response.status).toBe(200);
      expect(response.body.statusData.status).toBeDefined();
    });

    it('should return 400 when court id is not numeric', async () => {
      const response = await request(httpServer).get('/complexes/1/courts/not-a-number/status');

      expect(response.status).toBe(400);
    });
  });

  describe('POST /complexes/:complexId/courts/:courtId/status', () => {
    it('should create a court status entry', async () => {
      const court = await prisma.courts.findFirst({ where: { is_delete: false } });
      expect(court).toBeDefined();

      mockUser.role = Role.ADMIN;

      const response = await request(httpServer)
        .post(`/complexes/${court!.complex_id}/courts/${court!.id}/status`)
        .send({ status: 'MAINTENANCE', alertLevel: 1, estimatedDryingTime: 10 });

      expect(response.status).toBe(201);
      expect(response.body.id).toBe(court!.id);
      expect(response.body.statusData.status).toBe('MAINTENANCE');
      touchedCourtIds.add(court!.id);
    });
  });
});
