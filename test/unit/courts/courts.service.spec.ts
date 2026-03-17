import { ConflictException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ErrorsService } from '../../../src/common/errors.service';
import { UtilitiesService } from '../../../src/common/utilities.service';
import { CourtsStatusService } from '../../../src/courts-status/courts-status.service';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { ReservationsService } from '../../../src/reservations/reservations.service';
import { WeatherService } from '../../../src/weather/weather.service';
import { CourtsService } from '../../../src/courts/courts.service';
import { CourtStatus } from '../../../src/courts/enums';
import { ReservationAvailabilityStatus, ReservationStatus } from '../../../src/reservations/enums';

const mockPrisma = {
  courts: {
    aggregate: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

const mockErrorsService = {
  noBodyError: jest.fn(),
  dbError: jest.fn(),
};

const mockUtilitiesService = {
  groupArrayByField: jest.fn(),
  getTimeBlock: jest.fn(),
};

const mockWeatherService = {
  getWeatherFromId: jest.fn(),
};

const mockCourtsStatusService = {
  getCourtStatus: jest.fn(),
  setCourtStatus: jest.fn(),
};

const mockReservationsService = {
  getReservations: jest.fn(),
};

describe('CourtsService', () => {
  let service: CourtsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CourtsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ErrorsService, useValue: mockErrorsService },
        { provide: UtilitiesService, useValue: mockUtilitiesService },
        { provide: WeatherService, useValue: mockWeatherService },
        { provide: CourtsStatusService, useValue: mockCourtsStatusService },
        { provide: ReservationsService, useValue: mockReservationsService },
      ],
    }).compile();

    service = module.get<CourtsService>(CourtsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('calculates the next court number from the aggregate', async () => {
    mockPrisma.courts.aggregate.mockResolvedValue({ _max: { number: 3 } });

    await expect((service as any).calculateCourtNumber(1, 'padel')).resolves.toBe(4);
  });

  it('throws when a court number already exists', async () => {
    mockPrisma.courts.findFirst.mockResolvedValue({ id: 1 });

    await expect((service as any).checkExistingCourtNumber(1, 2, 'padel')).rejects.toThrow(ConflictException);
  });

  it('inserts trimmed availability windows when a weather block overlaps', () => {
    const result = (service as any).insertBlock(
      [
        {
          dateIni: new Date('2024-06-01T10:00:00Z'),
          dateEnd: new Date('2024-06-01T11:00:00Z'),
          available: false,
        },
      ],
      {
        dateIni: new Date('2024-06-01T10:30:00Z'),
        dateEnd: new Date('2024-06-01T11:30:00Z'),
      },
    );

    expect(result).toHaveLength(2);
    expect(result[1].dateIni.toISOString()).toBe('2024-06-01T11:00:00.000Z');
  });

  it('throws when no court is found', async () => {
    jest.spyOn(service, 'getCourts').mockResolvedValue([]);

    await expect(service.getCourt(1, 2)).rejects.toThrow(NotFoundException);
  });

  it('throws when multiple courts are found', async () => {
    jest.spyOn(service, 'getCourts').mockResolvedValue([{} as any, {} as any]);

    await expect(service.getCourt(1, 2)).rejects.toThrow(InternalServerErrorException);
  });

  it('creates a court and derives status from weather data', async () => {
    jest.spyOn(service as any, 'calculateCourtNumber').mockResolvedValue(1);
    jest.spyOn(service as any, 'checkExistingCourtNumber').mockResolvedValue(undefined);
    mockPrisma.courts.create.mockResolvedValue({
      id: 3,
      complex_id: 1,
      sport_key: 'padel',
      number: 1,
      description: 'Court',
      max_people: 4,
      created_at: new Date(),
      updated_at: new Date(),
    });
    mockWeatherService.getWeatherFromId.mockResolvedValue({
      alert_level: 2,
      estimated_drying_time: 60,
    });
    mockCourtsStatusService.setCourtStatus.mockResolvedValue({
      statusData: {
        status: CourtStatus.WEATHER,
        alertLevel: 2,
        estimatedDryingTime: 60,
      },
    });

    const result = await service.createCourt(1, {
      sportKey: 'padel',
      description: 'Court',
      maxPeople: 4,
      statusData: { status: CourtStatus.OPEN },
    } as any);

    expect(result.id).toBe(3);
    expect(result.statusData.status).toBe(CourtStatus.WEATHER);
  });

  it('creates a court with the provided inactive status without consulting weather', async () => {
    jest.spyOn(service as any, 'checkExistingCourtNumber').mockResolvedValue(undefined);
    mockPrisma.courts.create.mockResolvedValue({
      id: 4,
      complex_id: 1,
      sport_key: 'padel',
      number: 3,
      description: 'Maintenance court',
      max_people: 4,
      created_at: new Date(),
      updated_at: new Date(),
    });
    mockCourtsStatusService.setCourtStatus.mockResolvedValue({
      statusData: {
        status: CourtStatus.MAINTENANCE,
        alertLevel: 0,
        estimatedDryingTime: 0,
      },
    });

    const result = await service.createCourt(1, {
      number: 3,
      sportKey: 'padel',
      description: 'Maintenance court',
      maxPeople: 4,
      statusData: { status: CourtStatus.MAINTENANCE },
    } as any);

    expect(mockWeatherService.getWeatherFromId).not.toHaveBeenCalled();
    expect(mockCourtsStatusService.setCourtStatus).toHaveBeenCalledWith(1, 4, {
      status: CourtStatus.MAINTENANCE,
      alertLevel: 0,
      estimatedDryingTime: 0,
    });
    expect(result.statusData.status).toBe(CourtStatus.MAINTENANCE);
  });

  it('delegates database errors while creating a court', async () => {
    const error = new Error('db');
    jest.spyOn(service as any, 'calculateCourtNumber').mockResolvedValue(1);
    jest.spyOn(service as any, 'checkExistingCourtNumber').mockResolvedValue(undefined);
    mockPrisma.courts.create.mockRejectedValue(error);

    await expect(
      service.createCourt(1, {
        sportKey: 'padel',
        description: 'Court',
        maxPeople: 4,
        statusData: { status: CourtStatus.OPEN },
      } as any),
    ).rejects.toThrow(error);

    expect(mockErrorsService.dbError).toHaveBeenCalledWith(error, {
      p2003: 'Cannot assign court to complex with ID 1. Complex not found.',
      p2025: 'Court already exists.',
    });
  });

  it('updates the court and its status', async () => {
    jest.spyOn(service, 'getCourt').mockResolvedValue({
      number: 1,
      sportKey: 'padel',
    } as any);
    jest.spyOn(service as any, 'checkExistingCourtNumber').mockResolvedValue(undefined);
    mockPrisma.courts.update.mockResolvedValue({
      id: 3,
      complex_id: 1,
      sport_key: 'padel',
      number: 2,
      description: 'Updated',
      max_people: 4,
      created_at: new Date(),
      updated_at: new Date(),
    });
    mockCourtsStatusService.setCourtStatus.mockResolvedValue({
      statusData: { status: CourtStatus.BLOCKED, alertLevel: 0, estimatedDryingTime: 0 },
    });

    const result = await service.updateCourt(1, 3, {
      number: 2,
      description: 'Updated',
      statusData: { status: CourtStatus.BLOCKED, alertLevel: 0, estimatedDryingTime: 0 },
    } as any);

    expect(mockErrorsService.noBodyError).toHaveBeenCalled();
    expect(result.number).toBe(2);
  });

  it('groups future non-cancelled reservations into availability slots', async () => {
    const futureDateIni = new Date(Date.now() + 60 * 60 * 1000);
    const futureDateEnd = new Date(Date.now() + 2 * 60 * 60 * 1000);
    mockReservationsService.getReservations.mockResolvedValue([
      {
        courtId: 3,
        status: ReservationAvailabilityStatus.EMPTY,
        reservationStatus: ReservationStatus.SCHEDULED,
        dateIni: futureDateIni,
        dateEnd: futureDateEnd,
      },
    ]);
    mockUtilitiesService.groupArrayByField.mockReturnValue(
      new Map([[3, [{ courtId: 3, dateIni: futureDateIni, dateEnd: futureDateEnd }]]]),
    );
    jest.spyOn(service, 'getCourts').mockResolvedValue([{ id: 3 } as any]);
    mockCourtsStatusService.getCourtStatus.mockResolvedValue({
      statusData: { status: CourtStatus.OPEN, estimatedDryingTime: 0 },
    });

    const result = await service.getCourtsAvailability(1, false);

    expect(result).toHaveLength(1);
    expect(result[0].availability).toHaveLength(1);
  });

  it('filters courts by status data and forwards prisma ordering', async () => {
    mockPrisma.courts.findMany.mockResolvedValue([
      {
        id: 3,
        complex_id: 1,
        sport_key: 'padel',
        number: 1,
        description: 'Court 1',
        max_people: 4,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 4,
        complex_id: 1,
        sport_key: 'padel',
        number: 2,
        description: 'Court 2',
        max_people: 4,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
    mockCourtsStatusService.getCourtStatus
      .mockResolvedValueOnce({
        statusData: {
          status: CourtStatus.OPEN,
          alertLevel: 0,
          estimatedDryingTime: 0,
        },
      })
      .mockResolvedValueOnce({
        statusData: {
          status: CourtStatus.WEATHER,
          alertLevel: 2,
          estimatedDryingTime: 45,
        },
      });

    const result = await service.getCourts(1, {
      sportKey: 'pad',
      statusData: { status: CourtStatus.WEATHER, alertLevel: 2, estimatedDryingTime: 45 },
      orderParams: [{ field: 'number', order: 'desc' }],
    } as any);

    expect(mockPrisma.courts.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          complex_id: 1,
          is_delete: false,
          sport_key: { contains: 'pad', mode: 'insensitive' },
        }),
        orderBy: [{ number: 'desc' }],
      }),
    );
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(4);
  });

  it('merges contiguous reservations when grouped availability is requested', async () => {
    const baseDate = new Date(Date.now() + 60 * 60 * 1000);
    const secondDate = new Date(baseDate.getTime() + 30 * 60 * 1000);
    const thirdDate = new Date(secondDate.getTime() + 30 * 60 * 1000);

    mockReservationsService.getReservations.mockResolvedValue([
      {
        courtId: 3,
        status: ReservationAvailabilityStatus.EMPTY,
        reservationStatus: ReservationStatus.SCHEDULED,
        dateIni: baseDate,
        dateEnd: secondDate,
      },
      {
        courtId: 3,
        status: ReservationAvailabilityStatus.EMPTY,
        reservationStatus: ReservationStatus.SCHEDULED,
        dateIni: secondDate,
        dateEnd: thirdDate,
      },
    ]);
    mockUtilitiesService.groupArrayByField.mockReturnValue(
      new Map([
        [
          3,
          [
            { courtId: 3, dateIni: baseDate, dateEnd: secondDate },
            { courtId: 3, dateIni: secondDate, dateEnd: thirdDate },
          ],
        ],
      ]),
    );
    jest.spyOn(service, 'getCourts').mockResolvedValue([{ id: 3 } as any]);
    mockCourtsStatusService.getCourtStatus.mockResolvedValue({
      statusData: { status: CourtStatus.OPEN, estimatedDryingTime: 0 },
    });

    const result = await service.getCourtsAvailability(1, true);

    expect(result[0].availability).toHaveLength(1);
    expect(result[0].availability[0].dateIni).toEqual(baseDate);
    expect(result[0].availability[0].dateEnd).toEqual(thirdDate);
  });

  it('deletes a court by marking it as deleted', async () => {
    mockPrisma.courts.update.mockResolvedValue({});

    await expect(service.deleteCourt(1, 3)).resolves.toBeNull();
    expect(mockPrisma.courts.update).toHaveBeenCalledWith({
      where: { id: 3 },
      data: expect.objectContaining({ is_delete: true }),
    });
  });

  it('delegates database errors while deleting a court', async () => {
    const error = new Error('db');
    mockPrisma.courts.update.mockRejectedValue(error);

    await expect(service.deleteCourt(1, 3)).rejects.toThrow(error);
    expect(mockErrorsService.dbError).toHaveBeenCalledWith(error, {
      p2025: 'Court with ID 3 not found.',
    });
  });

  it('returns an empty default availability when a court is not found in grouped results', async () => {
    jest.spyOn(service, 'getCourtsAvailability').mockResolvedValue([]);

    const result = await service.getCourtAvailability(1, 99);

    expect(result.id).toBe(99);
  });
});
