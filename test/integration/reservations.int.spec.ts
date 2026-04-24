import { Role } from '../../src/auth/enums/index.js';
import { ErrorsService } from '../../src/common/errors.service.js';
import { UtilitiesService } from '../../src/common/utilities.service.js';
import { CourtsStatusService } from '../../src/courts-status/courts-status.service.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import { ComplexReservationsController } from '../../src/reservations/complex-reservations.controller.js';
import { CreateReservationDto } from '../../src/reservations/dto/index.js';
import { ReservationsController } from '../../src/reservations/reservations.controller.js';
import { ReservationsService } from '../../src/reservations/reservations.service.js';
import { UserReservationsController } from '../../src/reservations/user-reservations.controller.js';
import request from 'supertest';
import {
  cleanupComplexes,
  cleanupCourts,
  cleanupSports,
  cleanupUsers,
  createComplexRecord,
  createCourtRecord,
  createIntegrationApp,
  createSportRecord,
  createUserRecord,
  mockUser,
  resetMockUser,
} from './mock/factories.js';

//--------------------------------------------------------------------------------------------------------------------//
// Test suite
//--------------------------------------------------------------------------------------------------------------------//

describe('ReservationsController (integration)', () => {
  let app: Awaited<ReturnType<typeof createIntegrationApp>>['app'];
  let httpServer: any;
  let prisma: PrismaService;

  const createdUserIds: number[] = [];
  const createdComplexIds: number[] = [];
  const createdSportKeys: string[] = [];
  const createdCourtIds: number[] = [];
  const createdReservationIds: number[] = [];

  //------------------------------------------------------------------------------------------------------------------//
  // Helpers
  //------------------------------------------------------------------------------------------------------------------//

  beforeAll(async () => {
    const setup = await createIntegrationApp({
      controllers: [ReservationsController, UserReservationsController, ComplexReservationsController],
      providers: [ReservationsService, PrismaService, ErrorsService, UtilitiesService, CourtsStatusService],
    });

    app = setup.app;
    httpServer = setup.httpServer;
    prisma = setup.prisma!;
  });

  afterAll(async () => {
    await app?.close();
  });

  afterEach(async () => {
    if (createdReservationIds.length > 0) {
      await prisma.reservations.deleteMany({ where: { id: { in: createdReservationIds } } });
      createdReservationIds.length = 0;
    }

    await cleanupCourts(prisma, createdCourtIds);
    await cleanupComplexes(prisma, createdComplexIds);
    await cleanupSports(prisma, createdSportKeys);
    await cleanupUsers(prisma, createdUserIds);
    resetMockUser();
  });

  const createReservationFixture = async () => {
    const complex = await createComplexRecord(prisma, createdComplexIds);
    const sport = await createSportRecord(prisma, createdSportKeys, { max_people: 4 });

    const user = await createUserRecord(prisma, createdUserIds, Role.CLIENT, {
      name: 'Reservation',
      surname: 'Integration',
    });
    const court = await createCourtRecord(prisma, createdCourtIds, {
      complex_id: complex.id,
      sport_key: sport.key,
      description: 'Reservation integration court',
      max_people: sport.max_people,
    });

    const start = new Date();
    start.setHours(12, 0, 0, 0);
    const end = new Date();
    end.setHours(13, 0, 0, 0);

    return { complex, user, court, start, end };
  };

  describe('POST /complexes/:complexId/reservations', () => {
    it('should create a reservation', async () => {
      const { complex, user, court, start, end } = await createReservationFixture();

      const createResponse = await request(httpServer)
        .post(`/complexes/${complex.id}/reservations`)
        .send({
          userId: user.id,
          courtId: court.id,
          dateIni: start,
          dateEnd: end,
        } as CreateReservationDto);

      expect(createResponse.status).toBe(201);
      expect(createResponse.body).toHaveProperty('id');
      createdReservationIds.push(createResponse.body.id);
    });
  });

  describe('GET /reservations/:id', () => {
    it('should retrieve a reservation by id', async () => {
      const { complex, user, court, start, end } = await createReservationFixture();

      const createResponse = await request(httpServer)
        .post(`/complexes/${complex.id}/reservations`)
        .send({
          userId: user.id,
          courtId: court.id,
          dateIni: start,
          dateEnd: end,
        } as CreateReservationDto);

      expect(createResponse.status).toBe(201);
      createdReservationIds.push(createResponse.body.id);

      const getResponse = await request(httpServer).get(`/reservations/${createResponse.body.id}`);

      expect(getResponse.status).toBe(200);
      expect(getResponse.body.id).toBe(createResponse.body.id);
    });
  });

  describe('GET /users/:userId/reservations', () => {
    it('should return 403 when a CLIENT asks for another user reservations', async () => {
      const { user } = await createReservationFixture();
      mockUser.role = Role.CLIENT;
      mockUser.id = user.id + 1000;

      const response = await request(httpServer).get(`/users/${user.id}/reservations`);

      expect(response.status).toBe(403);
    });
  });

  describe('GET /complexes/:complexId/reservations', () => {
    it('should list reservations for a complex', async () => {
      const { complex } = await createReservationFixture();

      const response = await request(httpServer).get(`/complexes/${complex.id}/reservations`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });
});
