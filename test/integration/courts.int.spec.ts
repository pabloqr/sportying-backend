import { ErrorsService } from 'src/common/errors.service';
import { UtilitiesService } from 'src/common/utilities.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CourtsController } from 'src/courts/courts.controller';
import { CourtsService } from 'src/courts/courts.service';
import { CourtsStatusService } from 'src/courts-status/courts-status.service';
import { ReservationsService } from 'src/reservations/reservations.service';
import { WeatherService } from 'src/weather/weather.service';
import request from 'supertest';
import { createIntegrationApp, resetMockUser } from './mock/factories';

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
    if (createdCourtIds.length > 0) {
      await prisma.courts_status.deleteMany({ where: { court_id: { in: createdCourtIds } } });
      await prisma.courts.deleteMany({ where: { id: { in: createdCourtIds } } });
      createdCourtIds.length = 0;
    }

    resetMockUser();
    jest.clearAllMocks();
  });

  describe('GET /complexes/:complexId/courts', () => {
    it('should list courts for a complex', async () => {
      const complex = await prisma.complexes.findFirst({ where: { is_delete: false } });
      expect(complex).toBeDefined();

      const response = await request(httpServer).get(`/complexes/${complex!.id}/courts`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('POST /complexes/:complexId/courts', () => {
    it('should create a court', async () => {
      const complex = await prisma.complexes.findFirst({ where: { is_delete: false } });
      const sport = await prisma.sports.findFirst({ where: { is_delete: false } });
      expect(complex).toBeDefined();
      expect(sport).toBeDefined();

      const response = await request(httpServer).post(`/complexes/${complex!.id}/courts`).send({
        sportKey: sport!.key,
        description: 'Integration created court',
        maxPeople: sport!.max_people,
        statusData: { status: 'OPEN', alertLevel: 0, estimatedDryingTime: 0 },
      });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.sportKey).toBe(sport!.key);
      createdCourtIds.push(response.body.id);
    });
  });
});
