import {
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ErrorsService } from '../../../src/common/errors.service';
import { UtilitiesService } from '../../../src/common/utilities.service';
import { CourtsStatusService } from '../../../src/courts-status/courts-status.service';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { ReservationsService } from '../../../src/reservations/reservations.service';
import { WeatherService } from '../../../src/weather/weather.service';
import { CourtsService } from '../../../src/courts/courts.service';
import { CourtStatus } from '../../../src/courts/enums';
import {
  ReservationAvailabilityStatus,
  ReservationStatus,
} from '../../../src/reservations/enums';

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

    await expect(
      (service as any).checkExistingCourtNumber(1, 2, 'padel'),
    ).rejects.toThrow(ConflictException);
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

    await expect(service.getCourt(1, 2)).rejects.toThrow(
      InternalServerErrorException,
    );
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

  it('returns an empty default availability when a court is not found in grouped results', async () => {
    jest.spyOn(service, 'getCourtsAvailability').mockResolvedValue([]);

    const result = await service.getCourtAvailability(1, 99);

    expect(result.id).toBe(99);
  });
});
