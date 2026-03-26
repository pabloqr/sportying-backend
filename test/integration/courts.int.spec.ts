import { ErrorsService } from 'src/common/errors.service';
import { UtilitiesService } from 'src/common/utilities.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CourtsController } from 'src/courts/courts.controller';
import { CourtsService } from 'src/courts/courts.service';
import { CourtsStatusService } from 'src/courts-status/courts-status.service';
import { ReservationsService } from 'src/reservations/reservations.service';
import { WeatherService } from 'src/weather/weather.service';
import request from 'supertest';
import {
  cleanupComplexes,
  cleanupCourts,
  cleanupSports,
  createComplexRecord,
  createCourtRecord,
  createIntegrationApp,
  createSportRecord,
  resetMockUser,
} from './mock/factories';

const weatherServiceMock = {
  getWeatherFromId: jest.fn().mockResolvedValue({
    alert_level: 0,
    estimated_drying_time: 0,
  }),
};

const reservationsServiceMock = {
  getReservations: jest.fn().mockResolvedValue([]),
};

describe('CourtsController (integration)', () => {
  let app: Awaited<ReturnType<typeof createIntegrationApp>>['app'];
  let httpServer: any;
  let prisma: PrismaService;

  const createdComplexIds: number[] = [];
  const createdSportKeys: string[] = [];
  const createdCourtIds: number[] = [];

  beforeAll(async () => {
    const setup = await createIntegrationApp({
      controllers: [CourtsController],
      providers: [
        CourtsService,
        PrismaService,
        ErrorsService,
        UtilitiesService,
        CourtsStatusService,
        { provide: WeatherService, useValue: weatherServiceMock },
        { provide: ReservationsService, useValue: reservationsServiceMock },
      ],
    });

    app = setup.app;
    httpServer = setup.httpServer;
    prisma = setup.prisma!;
  });

  afterAll(async () => {
    await app?.close();
  });

  afterEach(async () => {
    await cleanupCourts(prisma, createdCourtIds);
    await cleanupComplexes(prisma, createdComplexIds);
    await cleanupSports(prisma, createdSportKeys);
    resetMockUser();
    jest.clearAllMocks();
  });

  describe('GET /complexes/:complexId/courts', () => {
    it('should list courts for a complex', async () => {
      const complex = await createComplexRecord(prisma, createdComplexIds);
      const sport = await createSportRecord(prisma, createdSportKeys);
      await createCourtRecord(prisma, createdCourtIds, {
        complex_id: complex.id,
        sport_key: sport.key,
        description: 'Integration listed court',
        max_people: sport.max_people,
      });

      const response = await request(httpServer).get(`/complexes/${complex.id}/courts`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('POST /complexes/:complexId/courts', () => {
    it('should create a court', async () => {
      const complex = await createComplexRecord(prisma, createdComplexIds);
      const sport = await createSportRecord(prisma, createdSportKeys, { max_people: 4 });

      const response = await request(httpServer)
        .post(`/complexes/${complex.id}/courts`)
        .send({
          sportKey: sport.key,
          description: 'Integration created court',
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
