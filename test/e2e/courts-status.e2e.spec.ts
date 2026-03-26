import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from 'src/auth/enums';
import { PrismaService } from 'src/prisma/prisma.service';
import request from 'supertest';
import {
  cleanupComplexes,
  cleanupCourts,
  cleanupSports,
  cleanupUsers,
  createAuthHeader,
  createComplexRecord,
  createCourtRecord,
  createE2EApp,
  createSportRecord,
} from './mock/factories';

//--------------------------------------------------------------------------------------------------------------------//
// Test suite
//--------------------------------------------------------------------------------------------------------------------//

describe('CourtsStatusController (e2e)', () => {
  let app: INestApplication;
  let httpServer: any;
  let prisma: PrismaService;
  let jwtService: JwtService;

  const createdUserIds: number[] = [];
  const createdSportKeys: string[] = [];
  const createdComplexIds: number[] = [];
  const createdCourtIds: number[] = [];

  //------------------------------------------------------------------------------------------------------------------//
  // Helpers
  //------------------------------------------------------------------------------------------------------------------//

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
    await cleanupCourts(prisma, createdCourtIds);
    await cleanupComplexes(prisma, createdComplexIds);
    await cleanupSports(prisma, createdSportKeys);
    await cleanupUsers(prisma, createdUserIds);
  });

  const createCourtFixture = async () => {
    const complex = await createComplexRecord(prisma, createdComplexIds);
    const sport = await createSportRecord(prisma, createdSportKeys);
    const court = await createCourtRecord(prisma, createdCourtIds, {
      complex_id: complex.id,
      sport_key: sport.key,
      max_people: sport.max_people,
    });

    return { complex, sport, court };
  };

  describe('GET /complexes/:complexId/courts/:courtId/status', () => {
    it('should return the default OPEN status when no status exists', async () => {
      const { authHeader } = await createAuthHeader(prisma, jwtService, createdUserIds, Role.CLIENT);
      const { complex, court } = await createCourtFixture();

      const response = await request(httpServer)
        .get(`/complexes/${complex.id}/courts/${court.id}/status`)
        .set('Authorization', authHeader);

      expect(response.status).toBe(200);
      expect(response.body.statusData.status).toBeDefined();
    });

    it('should return 400 when court id is not numeric', async () => {
      const { authHeader } = await createAuthHeader(prisma, jwtService, createdUserIds, Role.CLIENT);
      const response = await request(httpServer)
        .get('/complexes/1/courts/not-a-number/status')
        .set('Authorization', authHeader);

      expect(response.status).toBe(400);
    });
  });

  describe('POST /complexes/:complexId/courts/:courtId/status', () => {
    it('should create a court status entry', async () => {
      const { authHeader } = await createAuthHeader(prisma, jwtService, createdUserIds, Role.ADMIN);
      const { complex, court } = await createCourtFixture();

      const response = await request(httpServer)
        .post(`/complexes/${complex.id}/courts/${court.id}/status`)
        .set('Authorization', authHeader)
        .send({ status: 'MAINTENANCE', alertLevel: 1, estimatedDryingTime: 10 });

      expect(response.status).toBe(201);
      expect(response.body.id).toBe(court.id);
      expect(response.body.statusData.status).toBe('MAINTENANCE');
    });
  });
});
