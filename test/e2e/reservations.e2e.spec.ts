import { INestApplication } from '@nestjs/common';
import { Role } from 'src/auth/enums';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateReservationDto } from 'src/reservations/dto';
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
  createUserRecord,
  getUniqueMail,
  getUniquePhoneNumber,
  signAuthHeader,
} from './mock/factories';

//--------------------------------------------------------------------------------------------------------------------//
// Test suite
//--------------------------------------------------------------------------------------------------------------------//

describe('ReservationsController (e2e)', () => {
  let app: INestApplication;
  let httpServer: any;
  let prisma: PrismaService;
  let jwtService: any;

  const createdUserIds: number[] = [];
  const createdComplexIds: number[] = [];
  const createdSportKeys: string[] = [];
  const createdCourtIds: number[] = [];
  const createdReservationIds: number[] = [];

  //------------------------------------------------------------------------------------------------------------------//
  // Helpers
  //------------------------------------------------------------------------------------------------------------------//

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
    if (createdReservationIds.length > 0) {
      await prisma.reservations.deleteMany({ where: { id: { in: createdReservationIds } } });
      createdReservationIds.length = 0;
    }

    await cleanupCourts(prisma, createdCourtIds);
    await cleanupComplexes(prisma, createdComplexIds);
    await cleanupSports(prisma, createdSportKeys);
    await cleanupUsers(prisma, createdUserIds);
  });

  const createReservationFixture = async () => {
    const complex = await createComplexRecord(prisma, createdComplexIds);
    const sport = await createSportRecord(prisma, createdSportKeys, { max_people: 4 });

    const user = await createUserRecord(prisma, createdUserIds, Role.CLIENT, {
      name: 'Reservation',
      surname: 'E2E',
      mail: getUniqueMail('reservation'),
      phone_prefix: 34,
      phone_number: getUniquePhoneNumber(),
    });

    const court = await createCourtRecord(prisma, createdCourtIds, {
      complex_id: complex.id,
      sport_key: sport.key,
      description: 'Reservation e2e court',
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
      const authHeader = await signAuthHeader(jwtService, user);

      const createResponse = await request(httpServer)
        .post(`/complexes/${complex.id}/reservations`)
        .set('Authorization', authHeader)
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
      const authHeader = await signAuthHeader(jwtService, user);

      const createResponse = await request(httpServer)
        .post(`/complexes/${complex.id}/reservations`)
        .set('Authorization', authHeader)
        .send({
          userId: user.id,
          courtId: court.id,
          dateIni: start,
          dateEnd: end,
        } as CreateReservationDto);

      expect(createResponse.status).toBe(201);
      createdReservationIds.push(createResponse.body.id);

      const getResponse = await request(httpServer)
        .get(`/reservations/${createResponse.body.id}`)
        .set('Authorization', authHeader);

      expect(getResponse.status).toBe(200);
      expect(getResponse.body.id).toBe(createResponse.body.id);
    });
  });

  describe('GET /users/:userId/reservations', () => {
    it('should return 403 when a CLIENT asks for another user reservations', async () => {
      const { user } = await createReservationFixture();
      const { authHeader } = await createAuthHeader(prisma, jwtService, createdUserIds, Role.CLIENT);

      const response = await request(httpServer).get(`/users/${user.id}/reservations`).set('Authorization', authHeader);

      expect(response.status).toBe(403);
    });
  });

  describe('GET /complexes/:complexId/reservations', () => {
    it('should list reservations for a complex', async () => {
      const { complex } = await createReservationFixture();
      const { authHeader } = await createAuthHeader(prisma, jwtService, createdUserIds, Role.CLIENT);

      const response = await request(httpServer)
        .get(`/complexes/${complex.id}/reservations`)
        .set('Authorization', authHeader);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });
});
