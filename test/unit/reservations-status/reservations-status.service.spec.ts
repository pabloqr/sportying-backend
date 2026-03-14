import { Test, TestingModule } from '@nestjs/testing';
import { ErrorsService } from '../../../src/common/errors.service';
import { UtilitiesService } from '../../../src/common/utilities.service';
import { CourtsStatusService } from '../../../src/courts-status/courts-status.service';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { ReservationsStatusService } from '../../../src/reservations-status/reservations-status.service';
import { CourtStatus } from '../../../src/courts/enums';
import {
  ReservationAvailabilityStatus,
  ReservationStatus,
  ReservationTimeFilter,
} from '../../../src/reservations/enums';

const mockPrisma = {
  reservations: {
    update: jest.fn(),
  },
};

const mockErrorsService = {
  dbError: jest.fn(),
};

const mockUtilitiesService = {
  getTimeFilterFromDate: jest.fn(),
  getReservationStatus: jest.fn(),
};

const mockCourtsStatusService = {
  getCourtStatus: jest.fn(),
};

describe('ReservationsStatusService', () => {
  let service: ReservationsStatusService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationsStatusService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ErrorsService, useValue: mockErrorsService },
        { provide: UtilitiesService, useValue: mockUtilitiesService },
        { provide: CourtsStatusService, useValue: mockCourtsStatusService },
      ],
    }).compile();

    service = module.get<ReservationsStatusService>(ReservationsStatusService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('updates the reservation status and enriches the response', async () => {
    mockPrisma.reservations.update.mockResolvedValue({
      id: 5,
      complex_id: 1,
      court_id: 2,
      user_id: 3,
      date_ini: new Date('2024-06-01T10:00:00Z'),
      date_end: new Date('2024-06-01T11:00:00Z'),
      status: ReservationAvailabilityStatus.OCCUPIED,
      created_at: new Date(),
      updated_at: new Date(),
    });
    mockUtilitiesService.getTimeFilterFromDate.mockReturnValue(
      ReservationTimeFilter.UPCOMING,
    );
    mockUtilitiesService.getReservationStatus.mockReturnValue(
      ReservationStatus.SCHEDULED,
    );
    mockCourtsStatusService.getCourtStatus.mockResolvedValue({
      statusData: { status: CourtStatus.OPEN },
    });

    const result = await service.setReservationStatus(
      5,
      ReservationAvailabilityStatus.OCCUPIED,
    );

    expect(mockPrisma.reservations.update).toHaveBeenCalled();
    expect(result.id).toBe(5);
    expect(result.reservationStatus).toBe(ReservationStatus.SCHEDULED);
  });

  it('delegates db errors and rethrows them', async () => {
    const error = new Error('db');
    mockPrisma.reservations.update.mockRejectedValue(error);

    await expect(
      service.setReservationStatus(5, ReservationAvailabilityStatus.CANCELLED),
    ).rejects.toThrow(error);
    expect(mockErrorsService.dbError).toHaveBeenCalled();
  });
});
