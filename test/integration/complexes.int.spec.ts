import { ErrorsService } from 'src/common/errors.service';
import { UtilitiesService } from 'src/common/utilities.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ComplexesController } from 'src/complexes/complexes.controller';
import { ComplexesService } from 'src/complexes/complexes.service';
import { SportsService } from 'src/sports/sports.service';
import { WeatherService } from 'src/weather/weather.service';
import { CourtsService } from 'src/courts/courts.service';
import request from 'supertest';
import { createIntegrationApp, resetMockUser } from './mock/factories';

//--------------------------------------------------------------------------------------------------------------------//
// Mock factories
//--------------------------------------------------------------------------------------------------------------------//

const weatherServiceMock = {
  getWeatherFromGeohash: jest.fn().mockResolvedValue({
    alertLevel: 0,
    estimatedDryingTime: 0,
  }),
  getWeatherFromCoordinates: jest.fn().mockResolvedValue({
    alertLevel: 0,
    estimatedDryingTime: 0,
  }),
};

const courtsServiceMock = {
  getCourtsAvailability: jest.fn().mockResolvedValue([]),
};

//--------------------------------------------------------------------------------------------------------------------//
// Test suite
//--------------------------------------------------------------------------------------------------------------------//

describe('ComplexesController (integration)', () => {
  let app: Awaited<ReturnType<typeof createIntegrationApp>>['app'];
  let httpServer: any;
  let prisma: PrismaService;
  const createdComplexIds: number[] = [];

  beforeAll(async () => {
    const setup = await createIntegrationApp({
      controllers: [ComplexesController],
      providers: [
        ComplexesService,
        PrismaService,
        ErrorsService,
        UtilitiesService,
        SportsService,
        { provide: WeatherService, useValue: weatherServiceMock },
        { provide: CourtsService, useValue: courtsServiceMock },
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
    if (createdComplexIds.length > 0) {
      await prisma.complexes.deleteMany({ where: { id: { in: createdComplexIds } } });
      createdComplexIds.length = 0;
    }

    resetMockUser();
    jest.clearAllMocks();
  });

  describe('GET /complexes', () => {
    it('should return an array of complexes', async () => {
      const response = await request(httpServer).get('/complexes');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('POST /complexes', () => {
    it('should create a complex', async () => {
      const createResponse = await request(httpServer).post('/complexes').send({
        complexName: `Integration Complex ${Date.now()}`,
        timeIni: '08:00',
        timeEnd: '22:00',
        locLatitude: 40.1234 + Math.random() / 1000,
        locLongitude: -3.1234 - Math.random() / 1000,
      });

      expect(createResponse.status).toBe(201);
      expect(createResponse.body).toHaveProperty('id');
      createdComplexIds.push(createResponse.body.id);
    });
  });

  describe('PUT /complexes/:id', () => {
    it('should update a complex', async () => {
      const createResponse = await request(httpServer).post('/complexes').send({
        complexName: `Integration Complex ${Date.now()}`,
        timeIni: '08:00',
        timeEnd: '22:00',
        locLatitude: 40.1234 + Math.random() / 1000,
        locLongitude: -3.1234 - Math.random() / 1000,
      });

      expect(createResponse.status).toBe(201);
      createdComplexIds.push(createResponse.body.id);

      const updateResponse = await request(httpServer)
        .put(`/complexes/${createResponse.body.id}`)
        .send({ complexName: 'Updated Integration Complex' });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.complexName).toBe('Updated Integration Complex');
    });
  });
});
