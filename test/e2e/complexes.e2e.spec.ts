import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '../../src/auth/enums/index.js';
import { CourtsService } from '../../src/courts/courts.service.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import { WeatherService } from '../../src/weather/weather.service.js';
import request from 'supertest';
import { cleanupUsers, createAuthHeader, createE2EApp, createWeatherServiceMock } from './mock/factories.js';

//--------------------------------------------------------------------------------------------------------------------//
// Mock factories
//--------------------------------------------------------------------------------------------------------------------//

const weatherServiceMock = createWeatherServiceMock({
  getWeatherFromGeohash: jest.fn().mockResolvedValue({
    alertLevel: 0,
    estimatedDryingTime: 0,
  }),
  getWeatherFromCoordinates: jest.fn().mockResolvedValue({
    alertLevel: 0,
    estimatedDryingTime: 0,
  }),
});

const courtsServiceMock = {
  getCourtsAvailability: jest.fn().mockResolvedValue([]),
};

//--------------------------------------------------------------------------------------------------------------------//
// Test suite
//--------------------------------------------------------------------------------------------------------------------//

describe('ComplexesController (e2e)', () => {
  let app: INestApplication;
  let httpServer: any;
  let prisma: PrismaService;
  let jwtService: JwtService;

  const createdUserIds: number[] = [];
  const createdComplexIds: number[] = [];

  beforeAll(async () => {
    const setup = await createE2EApp([
      { provide: WeatherService, useValue: weatherServiceMock },
      { provide: CourtsService, useValue: courtsServiceMock },
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
    if (createdComplexIds.length > 0) {
      await prisma.complexes.deleteMany({ where: { id: { in: createdComplexIds } } });
      createdComplexIds.length = 0;
    }

    await cleanupUsers(prisma, createdUserIds);
    jest.clearAllMocks();
  });

  describe('GET /complexes', () => {
    it('should return an array of complexes', async () => {
      const { authHeader } = await createAuthHeader(prisma, jwtService, createdUserIds, Role.SUPERADMIN);
      const response = await request(httpServer).get('/complexes').set('Authorization', authHeader);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('POST /complexes', () => {
    it('should create a complex', async () => {
      const { authHeader } = await createAuthHeader(prisma, jwtService, createdUserIds, Role.SUPERADMIN);
      const createResponse = await request(httpServer)
        .post('/complexes')
        .set('Authorization', authHeader)
        .send({
          complexName: `E2E Complex ${Date.now()}`,
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
      const { authHeader } = await createAuthHeader(prisma, jwtService, createdUserIds, Role.SUPERADMIN);
      const createResponse = await request(httpServer)
        .post('/complexes')
        .set('Authorization', authHeader)
        .send({
          complexName: `E2E Complex ${Date.now()}`,
          timeIni: '08:00',
          timeEnd: '22:00',
          locLatitude: 40.1234 + Math.random() / 1000,
          locLongitude: -3.1234 - Math.random() / 1000,
        });

      expect(createResponse.status).toBe(201);
      createdComplexIds.push(createResponse.body.id);

      const updateResponse = await request(httpServer)
        .put(`/complexes/${createResponse.body.id}`)
        .set('Authorization', authHeader)
        .send({ complexName: 'Updated E2E Complex' });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.complexName).toBe('Updated E2E Complex');
    });
  });
});
