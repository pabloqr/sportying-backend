import { ErrorsService } from 'src/common/errors.service';
import { UtilitiesService } from 'src/common/utilities.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ReservationsController } from 'src/reservations/reservations.controller';
import { ReservationsService } from 'src/reservations/reservations.service';
import { UserReservationsController } from 'src/reservations/user-reservations.controller';
import { ComplexReservationsController } from 'src/reservations/complex-reservations.controller';
import { CourtsStatusService } from 'src/courts-status/courts-status.service';
import { Role } from 'src/auth/enums';
import request from 'supertest';
import { createIntegrationApp, mockUser, resetMockUser } from './mock/factories';
import { CreateReservationDto } from 'src/reservations/dto';

describe('ReservationsController (integration)', () => {
  let app: Awaited<ReturnType<typeof createIntegrationApp>>['app'];
  let httpServer: any;
  let prisma: PrismaService;
  const createdUserIds: number[] = [];
  const createdCourtIds: number[] = [];
  const createdReservationIds: number[] = [];

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

    if (createdCourtIds.length > 0) {
      await prisma.courts_status.deleteMany({ where: { court_id: { in: createdCourtIds } } });
      await prisma.courts.deleteMany({ where: { id: { in: createdCourtIds } } });
      createdCourtIds.length = 0;
    }

    if (createdUserIds.length > 0) {
      await prisma.users.deleteMany({ where: { id: { in: createdUserIds } } });
      createdUserIds.length = 0;
    }

    resetMockUser();
  });

  const createReservationFixture = async () => {
    const complex = await prisma.complexes.findFirst({ where: { is_delete: false } });
    const sport = await prisma.sports.findFirst({ where: { is_delete: false } });
    expect(complex).toBeDefined();
    expect(sport).toBeDefined();

    const user = await prisma.users.create({
      data: {
        role: 'CLIENT',
        password: 'hashed',
        name: 'Reservation',
        surname: 'Integration',
        mail: `reservation_${Date.now()}_${Math.random()}@test.com`,
        phone_prefix: 34,
        phone_number: Math.floor(600000000 + Math.random() * 1000000),
      },
    });
    createdUserIds.push(user.id);

    const court = await prisma.courts.create({
      data: {
        complex_id: complex!.id,
        sport_key: sport!.key,
        number: Math.floor(1000 + Math.random() * 1000),
        description: 'Reservation integration court',
        max_people: sport!.max_people,
      },
    });
    createdCourtIds.push(court.id);

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
        .post(`/complexes/${complex!.id}/reservations`)
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
        .post(`/complexes/${complex!.id}/reservations`)
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

      const response = await request(httpServer).get(`/complexes/${complex!.id}/reservations`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });
});
