import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from 'src/auth/enums';
import { PrismaService } from 'src/prisma/prisma.service';
import request from 'supertest';
import { cleanupSports, cleanupUsers, createAuthHeader, createE2EApp, createSportRecord } from './mock/factories';

//--------------------------------------------------------------------------------------------------------------------//
// Test suite
//--------------------------------------------------------------------------------------------------------------------//

describe('SportsController (e2e)', () => {
  let app: INestApplication;
  let httpServer: any;
  let prisma: PrismaService;
  let jwtService: JwtService;

  const createdUserIds: number[] = [];
  const createdSportKeys: string[] = [];

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
    await cleanupSports(prisma, createdSportKeys);
    await cleanupUsers(prisma, createdUserIds);
  });

  describe('GET /config/sports', () => {
    it('should return an array of sports', async () => {
      const { authHeader } = await createAuthHeader(prisma, jwtService, createdUserIds, Role.CLIENT);
      const response = await request(httpServer).get('/config/sports').set('Authorization', authHeader);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should filter sports by key', async () => {
      const { authHeader } = await createAuthHeader(prisma, jwtService, createdUserIds, Role.CLIENT);
      const sport = await createSportRecord(prisma, createdSportKeys);

      const response = await request(httpServer)
        .get('/config/sports')
        .set('Authorization', authHeader)
        .query({ keys: [sport!.key] });

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].key).toBe(sport!.key);
    });
  });

  describe('GET /config/sports/:sportKey', () => {
    it('should return a sport by key', async () => {
      const { authHeader } = await createAuthHeader(prisma, jwtService, createdUserIds, Role.CLIENT);
      const sport = await createSportRecord(prisma, createdSportKeys);

      const response = await request(httpServer).get(`/config/sports/${sport!.key}`).set('Authorization', authHeader);

      expect(response.status).toBe(200);
      expect(response.body.key).toBe(sport!.key);
    });

    it('should return 404 for a non-existing sport', async () => {
      const { authHeader } = await createAuthHeader(prisma, jwtService, createdUserIds, Role.CLIENT);
      const response = await request(httpServer)
        .get('/config/sports/should-not-exist')
        .set('Authorization', authHeader);

      expect(response.status).toBe(404);
    });
  });
});
