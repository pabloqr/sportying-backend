import { PrismaService } from '../../src/prisma/prisma.service.js';
import { SportsController } from '../../src/sports/sports.controller.js';
import { SportsService } from '../../src/sports/sports.service.js';
import request from 'supertest';
import { cleanupSports, createIntegrationApp, createSportRecord, resetMockUser } from './mock/factories.js';

//--------------------------------------------------------------------------------------------------------------------//
// Test suite
//--------------------------------------------------------------------------------------------------------------------//

describe('SportsController (integration)', () => {
  let app: Awaited<ReturnType<typeof createIntegrationApp>>['app'];
  let httpServer: any;
  let prisma: PrismaService;

  const createdSportKeys: string[] = [];

  beforeAll(async () => {
    const setup = await createIntegrationApp({
      controllers: [SportsController],
      providers: [SportsService, PrismaService],
    });

    app = setup.app;
    httpServer = setup.httpServer;
    prisma = setup.prisma!;
  });

  afterAll(async () => {
    await app?.close();
  });

  afterEach(async () => {
    await cleanupSports(prisma, createdSportKeys);
    resetMockUser();
  });

  describe('GET /config/sports', () => {
    it('should return an array of sports', async () => {
      const response = await request(httpServer).get('/config/sports');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should filter sports by key', async () => {
      const sport = await createSportRecord(prisma, createdSportKeys);

      const response = await request(httpServer)
        .get('/config/sports')
        .query({ keys: [sport!.key] });

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].key).toBe(sport!.key);
    });
  });

  describe('GET /config/sports/:sportKey', () => {
    it('should return a sport by key', async () => {
      const sport = await createSportRecord(prisma, createdSportKeys);

      const response = await request(httpServer).get(`/config/sports/${sport!.key}`);

      expect(response.status).toBe(200);
      expect(response.body.key).toBe(sport!.key);
    });

    it('should return 404 for a non-existing sport', async () => {
      const response = await request(httpServer).get('/config/sports/should-not-exist');

      expect(response.status).toBe(404);
    });
  });
});
