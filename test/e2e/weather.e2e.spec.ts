import { INestApplication } from '@nestjs/common';
import { Role } from 'src/auth/enums';
import { PrismaService } from 'src/prisma/prisma.service';
import { WeatherService } from 'src/weather/weather.service';
import request from 'supertest';
import { cleanupUsers, createAuthHeader, createE2EApp, createWeatherServiceMock } from './mock/factories';
import { JwtService } from '@nestjs/jwt';

const weatherServiceMock = createWeatherServiceMock({
  getWeatherFromId: jest.fn(),
});

describe('WeatherController (e2e)', () => {
  let app: INestApplication;
  let httpServer: any;
  let prisma: PrismaService;
  let jwtService: JwtService;

  const createdUserIds: number[] = [];

  beforeAll(async () => {
    const setup = await createE2EApp([{ provide: WeatherService, useValue: weatherServiceMock }]);

    app = setup.app;
    httpServer = setup.httpServer;
    prisma = setup.prisma;
    jwtService = setup.jwtService;
  });

  afterAll(async () => {
    await app?.close();
  });

  afterEach(async () => {
    await cleanupUsers(prisma, createdUserIds);
    jest.clearAllMocks();
  });

  describe('GET /complexes/:complexId/weather', () => {
    it('should return the weather for a complex', async () => {
      const { authHeader } = await createAuthHeader(prisma, jwtService, createdUserIds, Role.CLIENT);
      weatherServiceMock.getWeatherFromId.mockResolvedValue({
        alertLevel: 1,
        estimatedDryingTime: 0,
        precipIntensityCurr: 0,
        precipProbabilityCurr: 10,
        precipProbabilityNext: 15,
        relativeHumidityCurr: 40,
        temperatureCurr: 22,
        windDirectionCurr: 120,
        windSpeedCurr: 12,
        cloudCoverCurr: 20,
      });

      const response = await request(httpServer).get('/complexes/7/weather').set('Authorization', authHeader);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(7);
      expect(response.body.weather.alertLevel).toBe(1);
    });

    it('should return 400 when complex id is not numeric', async () => {
      const { authHeader } = await createAuthHeader(prisma, jwtService, createdUserIds, Role.CLIENT);
      const response = await request(httpServer)
        .get('/complexes/not-a-number/weather')
        .set('Authorization', authHeader);

      expect(response.status).toBe(400);
    });
  });
});
