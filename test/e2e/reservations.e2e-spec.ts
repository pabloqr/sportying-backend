import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { closeTestApp, createTestApp } from '../support/app';
import { resetDatabase } from '../support/database';
import { buildReservationDto, seedBaseCatalog, seedUser } from '../support/factories';

describe('Reservations e2e', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const testApp = await createTestApp();
    app = testApp.app;
    prisma = testApp.prisma;
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    await seedBaseCatalog(prisma);
    await seedUser(prisma, {
      mail: 'reservation-e2e@sportying.test',
      phone_number: 600000601,
    });
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  it('creates, reads, updates and deletes a reservation', async () => {
    const dto = buildReservationDto();
    const updatedDateEnd = new Date(dto.dateEnd.getTime() + 30 * 60 * 1000);

    const createResponse = await request(app.getHttpServer())
      .post('/complexes/1/reservations')
      .send(dto)
      .expect(201);

    expect(createResponse.body.courtId).toBe(1);

    const reservationId = createResponse.body.id;

    const getResponse = await request(app.getHttpServer())
      .get(`/reservations/${reservationId}`)
      .expect(200);

    expect(getResponse.body.id).toBe(reservationId);

    const updateResponse = await request(app.getHttpServer())
      .put(`/reservations/${reservationId}`)
      .send({
        dateEnd: updatedDateEnd.toISOString(),
      })
      .expect(200);

    expect(updateResponse.body.dateEnd).toBe(updatedDateEnd.toISOString());

    await request(app.getHttpServer())
      .delete(`/reservations/${reservationId}`)
      .expect(200);

    const storedReservation = await prisma.reservations.findUniqueOrThrow({
      where: {
        id: reservationId,
      },
    });

    expect(storedReservation.is_delete).toBe(true);
  });

  it('returns 400 for invalid reservation payloads', async () => {
    await request(app.getHttpServer())
      .post('/complexes/1/reservations')
      .send({
        userId: 1,
        courtId: 1,
        dateIni: 'invalid-date',
      })
      .expect(400);
  });

  it('returns 404 when updating a missing reservation', async () => {
    const updatedDateEnd = new Date(Date.now() + 2 * 60 * 60 * 1000);

    await request(app.getHttpServer())
      .put('/reservations/9999')
      .send({
        dateEnd: updatedDateEnd.toISOString(),
      })
      .expect(404);
  });

  it('returns 409 for conflicting reservations', async () => {
    const dto = buildReservationDto();

    await request(app.getHttpServer())
      .post('/complexes/1/reservations')
      .send(dto)
      .expect(201);

    await request(app.getHttpServer())
      .post('/complexes/1/reservations')
      .send(dto)
      .expect(409);
  });

  it('lists reservations through user and collection endpoints', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/complexes/1/reservations')
      .send(buildReservationDto())
      .expect(201);

    const reservationId = createResponse.body.id;

    const collectionResponse = await request(app.getHttpServer())
      .get('/reservations')
      .expect(200);

    const userResponse = await request(app.getHttpServer())
      .get('/users/1/reservations')
      .expect(200);

    expect(collectionResponse.body.some((item: any) => item.id === reservationId)).toBe(true);
    expect(userResponse.body.some((item: any) => item.id === reservationId)).toBe(true);
  });
});
