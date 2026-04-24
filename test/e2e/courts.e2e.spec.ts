import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '../../src/auth/enums/index.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import { ReservationsService } from '../../src/reservations/reservations.service.js';
import { WeatherService } from '../../src/weather/weather.service.js';
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
  createWeatherServiceMock,
} from './mock/factories.js';

//--------------------------------------------------------------------------------------------------------------------//
// Mock factories
//--------------------------------------------------------------------------------------------------------------------//

const weatherServiceMock = createWeatherServiceMock({
  getWeatherFromId: jest.fn().mockResolvedValue({
    alert_level: 0,
    estimated_drying_time: 0,
  }),
});

const reservationsServiceMock = {
  getReservations: jest.fn().mockResolvedValue([]),
};

//--------------------------------------------------------------------------------------------------------------------//
// Test suite
//--------------------------------------------------------------------------------------------------------------------//

describe('CourtsController (e2e)', () => {
  let app: INestApplication;
  let httpServer: any;
  let prisma: PrismaService;
  let jwtService: JwtService;

  const createdUserIds: number[] = [];
  const createdComplexIds: number[] = [];
  const createdSportKeys: string[] = [];
  const createdCourtIds: number[] = [];

  beforeAll(async () => {
    const setup = await createE2EApp([
      { provide: WeatherService, useValue: weatherServiceMock },
      { provide: ReservationsService, useValue: reservationsServiceMock },
    ]);

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
    jest.clearAllMocks();
  });

  describe('GET /complexes/:complexId/courts', () => {
    it('should list courts for a complex', async () => {
      const { authHeader } = await createAuthHeader(prisma, jwtService, createdUserIds, Role.CLIENT);
      const complex = await createComplexRecord(prisma, createdComplexIds);
      const sport = await createSportRecord(prisma, createdSportKeys);
      await createCourtRecord(prisma, createdCourtIds, {
        complex_id: complex.id,
        sport_key: sport.key,
        description: 'E2E listed court',
        max_people: sport.max_people,
      });

      const response = await request(httpServer)
        .get(`/complexes/${complex.id}/courts`)
        .set('Authorization', authHeader);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('POST /complexes/:complexId/courts', () => {
    it('should create a court', async () => {
      const { authHeader } = await createAuthHeader(prisma, jwtService, createdUserIds, Role.ADMIN);
      const complex = await createComplexRecord(prisma, createdComplexIds);
      const sport = await createSportRecord(prisma, createdSportKeys, { max_people: 4 });

      const response = await request(httpServer)
        .post(`/complexes/${complex.id}/courts`)
        .set('Authorization', authHeader)
        .send({
          sportKey: sport.key,
          description: 'E2E created court',
          maxPeople: sport.max_people,
          statusData: { status: 'OPEN', alertLevel: 0, estimatedDryingTime: 0 },
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.sportKey).toBe(sport.key);
      createdCourtIds.push(response.body.id);
    });
  });
});
