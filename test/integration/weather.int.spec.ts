import { WeatherController } from 'src/weather/weather.controller';
import { WeatherService } from 'src/weather/weather.service';
import request from 'supertest';
import { createIntegrationApp, resetMockUser } from './mock/factories';

const weatherServiceMock = {
  getWeatherFromId: jest.fn(),
};

describe('WeatherController (integration)', () => {
  let app: Awaited<ReturnType<typeof createIntegrationApp>>['app'];
  let httpServer: any;

  beforeAll(async () => {
    const setup = await createIntegrationApp({
      controllers: [WeatherController],
      providers: [{ provide: WeatherService, useValue: weatherServiceMock }],
    });

    app = setup.app;
    httpServer = setup.httpServer;
  });

  afterAll(async () => {
    await app?.close();
  });

  afterEach(() => {
    resetMockUser();
    jest.clearAllMocks();
  });

  describe('GET /complexes/:complexId/weather', () => {
    it('should return the weather for a complex', async () => {
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

      const response = await request(httpServer).get('/complexes/7/weather');

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(7);
      expect(response.body.weather.alertLevel).toBe(1);
    });

    it('should return 400 when complex id is not numeric', async () => {
      const response = await request(httpServer).get('/complexes/not-a-number/weather');

      expect(response.status).toBe(400);
    });
  });
});
