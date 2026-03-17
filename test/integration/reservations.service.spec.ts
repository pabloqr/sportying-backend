import { BadRequestException, INestApplication } from '@nestjs/common';
import { ReservationsService } from '../../src/reservations/reservations.service';
import { ReservationAvailabilityStatus, ReservationStatus, ReservationTimeFilter } from '../../src/reservations/enums';
import { PrismaService } from '../../src/prisma/prisma.service';
import { closeTestApp, createTestApp } from '../support/app';
import { resetDatabase } from '../support/database';
import { buildReservationDto, seedBaseCatalog, seedUser } from '../support/factories';

describe('ReservationsService integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let reservationsService: ReservationsService;

  beforeAll(async () => {
    const testApp = await createTestApp();
    app = testApp.app;
    prisma = testApp.prisma;
    reservationsService = app.get(ReservationsService);
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    await seedBaseCatalog(prisma);
    await seedUser(prisma, {
      mail: 'reservation-user@sportying.test',
      phone_number: 600000301,
    });
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  it('creates a reservation inside opening hours', async () => {
    const reservation = await reservationsService.createReservation(1, buildReservationDto());

    expect(reservation.id).toBeGreaterThan(0);
    expect(reservation.reservationStatus).toBe(ReservationStatus.SCHEDULED);
    expect(reservation.timeFilter).toBe(ReservationTimeFilter.UPCOMING);
  });

  it('rejects reservations outside the complex schedule', async () => {
    await prisma.complexes.update({
      where: {
        id: 1,
      },
      data: {
        time_ini: new Date(1970, 0, 1, 8, 0, 0),
        time_end: new Date(1970, 0, 1, 22, 0, 0),
      },
    });

    const dateIni = new Date();
    dateIni.setHours(7, 30, 0, 0);
    const dateEnd = new Date();
    dateEnd.setHours(8, 30, 0, 0);

    await expect(
      reservationsService.createReservation(
        1,
        buildReservationDto({
          dateIni,
          dateEnd,
        }),
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects reservations for invalid courts', async () => {
    await expect(
      reservationsService.createReservation(
        1,
        buildReservationDto({
          courtId: 999,
        }),
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects conflicting reservations with the same court and start date', async () => {
    await reservationsService.createReservation(1, buildReservationDto());

    await expect(
      reservationsService.createReservation(
        1,
        buildReservationDto({
          userId: 1,
        }),
      ),
    ).rejects.toThrow();
  });

  it('returns derived statuses for past, cancelled and weather reservations', async () => {
    const upcomingIni = new Date(Date.now() + 3 * 60 * 60 * 1000);
    const upcomingEnd = new Date(Date.now() + 4 * 60 * 60 * 1000);
    const pastIni = new Date(Date.now() - 4 * 60 * 60 * 1000);
    const pastEnd = new Date(Date.now() - 3 * 60 * 60 * 1000);
    const cancelledIni = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const cancelledEnd = new Date(Date.now() - 60 * 60 * 1000);

    const upcoming = await prisma.reservations.create({
      data: {
        user_id: 1,
        complex_id: 1,
        court_id: 1,
        date_ini: upcomingIni,
        date_end: upcomingEnd,
        status: ReservationAvailabilityStatus.EMPTY,
      },
    });

    const past = await prisma.reservations.create({
      data: {
        user_id: 1,
        complex_id: 1,
        court_id: 1,
        date_ini: pastIni,
        date_end: pastEnd,
        status: ReservationAvailabilityStatus.OCCUPIED,
      },
    });

    const cancelled = await prisma.reservations.create({
      data: {
        user_id: 1,
        complex_id: 1,
        court_id: 1,
        date_ini: cancelledIni,
        date_end: cancelledEnd,
        status: ReservationAvailabilityStatus.CANCELLED,
      },
    });

    await prisma.courts_status.create({
      data: {
        court_id: 1,
        status: 'WEATHER',
        alert_level: 2,
        estimated_drying_time: 60,
      },
    });

    const reservations = await reservationsService.getReservations({});

    expect(reservations.find((reservation) => reservation.id === upcoming.id)?.reservationStatus).toBe(
      ReservationStatus.WEATHER,
    );
    expect(reservations.find((reservation) => reservation.id === past.id)?.reservationStatus).toBe(
      ReservationStatus.COMPLETED,
    );
    expect(reservations.find((reservation) => reservation.id === cancelled.id)?.reservationStatus).toBe(
      ReservationStatus.CANCELLED,
    );
  });
});
