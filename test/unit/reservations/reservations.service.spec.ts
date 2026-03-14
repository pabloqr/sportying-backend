import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ErrorsService } from '../../../src/common/errors.service';
import { UtilitiesService } from '../../../src/common/utilities.service';
import { CourtsStatusService } from '../../../src/courts-status/courts-status.service';
import { CourtStatus } from '../../../src/courts/enums';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { ReservationsService } from '../../../src/reservations/reservations.service';
import {
  ReservationAvailabilityStatus,
  ReservationStatus,
  ReservationTimeFilter,
} from '../../../src/reservations/enums';

const mockPrisma = {
  courts: {
    findMany: jest.fn(),
  },
  complexes: {
    findUnique: jest.fn(),
  },
  reservations: {
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
  dateIsEqualOrGreater: jest.fn(),
  timeIsEqualOrGreater: jest.fn(),
  timeIsEqualOrLower: jest.fn(),
  getTimeFilterFromDate: jest.fn(),
  getReservationStatus: jest.fn(),
};

const mockCourtsStatusService = {
  getCourtStatus: jest.fn(),
};

describe('ReservationsService', () => {
  let service: ReservationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ErrorsService, useValue: mockErrorsService },
        { provide: UtilitiesService, useValue: mockUtilitiesService },
        { provide: CourtsStatusService, useValue: mockCourtsStatusService },
      ],
    }).compile();

    service = module.get<ReservationsService>(ReservationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('private helpers', () => {
    it('validates reservation windows inside complex opening hours', () => {
      mockUtilitiesService.timeIsEqualOrGreater.mockReturnValue(true);
      mockUtilitiesService.timeIsEqualOrLower.mockReturnValue(true);

      const isValid = (service as any).isValidDate(
        new Date(2026, 2, 11, 8, 0, 0),
        new Date(2026, 2, 11, 22, 0, 0),
        new Date(2026, 2, 11, 10, 0, 0),
        new Date(2026, 2, 11, 11, 0, 0),
      );

      expect(isValid).toBe(true);
    });

    it('rejects reservation windows outside complex opening hours', () => {
      mockUtilitiesService.timeIsEqualOrGreater.mockReturnValue(true);
      mockUtilitiesService.timeIsEqualOrLower.mockReturnValue(false);

      const isValid = (service as any).isValidDate(
        new Date(2026, 2, 11, 8, 0, 0),
        new Date(2026, 2, 11, 22, 0, 0),
        new Date(2026, 2, 11, 22, 0, 0),
        new Date(2026, 2, 11, 22, 30, 0),
      );

      expect(isValid).toBe(false);
    });
  });

  describe('validateCourt', () => {
    it('returns true when the court exists and is OPEN', async () => {
      mockPrisma.courts.findMany.mockResolvedValue([{ id: 7 }]);
      mockCourtsStatusService.getCourtStatus.mockResolvedValue({
        statusData: { status: CourtStatus.OPEN, estimatedDryingTime: 0 },
      });

      await expect(service.validateCourt(1, 7, new Date())).resolves.toBe(true);
    });

    it('returns true when the court is WEATHER and drying time has elapsed', async () => {
      const dateIni = new Date('2026-03-13T10:00:00Z');
      mockPrisma.courts.findMany.mockResolvedValue([{ id: 7 }]);
      mockCourtsStatusService.getCourtStatus.mockResolvedValue({
        statusData: { status: CourtStatus.WEATHER, estimatedDryingTime: 30 },
      });
      mockUtilitiesService.dateIsEqualOrGreater.mockReturnValue(true);

      await expect(service.validateCourt(1, 7, dateIni)).resolves.toBe(true);
      expect(mockUtilitiesService.dateIsEqualOrGreater).toHaveBeenCalled();
    });

    it('returns false when the court is not part of the complex', async () => {
      mockPrisma.courts.findMany.mockResolvedValue([{ id: 9 }]);
      mockCourtsStatusService.getCourtStatus.mockResolvedValue({
        statusData: { status: CourtStatus.OPEN, estimatedDryingTime: 0 },
      });

      await expect(service.validateCourt(1, 7, new Date())).resolves.toBe(false);
    });
  });

  describe('getReservations', () => {
    it('queries reservations and enriches them with derived status data', async () => {
      const dateEnd = new Date('2026-03-14T11:00:00Z');
      mockPrisma.reservations.findMany.mockResolvedValue([
        {
          id: 1,
          user_id: 4,
          complex_id: 1,
          court_id: 7,
          date_ini: new Date('2026-03-14T10:00:00Z'),
          date_end: dateEnd,
          status: ReservationAvailabilityStatus.EMPTY,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]);
      mockUtilitiesService.getTimeFilterFromDate.mockReturnValue(
        ReservationTimeFilter.UPCOMING,
      );
      mockCourtsStatusService.getCourtStatus.mockResolvedValue({
        statusData: { status: CourtStatus.OPEN },
      });
      mockUtilitiesService.getReservationStatus.mockReturnValue(
        ReservationStatus.SCHEDULED,
      );

      const result = await service.getReservations({ complexId: 1 });

      expect(mockPrisma.reservations.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            complex_id: 1,
            is_delete: false,
          }),
        }),
      );
      expect(result[0]).toMatchObject({
        id: 1,
        complexId: 1,
        courtId: 7,
        reservationStatus: ReservationStatus.SCHEDULED,
        timeFilter: ReservationTimeFilter.UPCOMING,
      });
    });

    it('applies the PAST time filter in the prisma query', async () => {
      mockPrisma.reservations.findMany.mockResolvedValue([]);

      await service.getReservations({ timeFilter: ReservationTimeFilter.PAST });

      expect(mockPrisma.reservations.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            is_delete: false,
            date_end: expect.objectContaining({ lt: expect.any(Date) }),
          }),
        }),
      );
    });

    it('filters cancelled reservations when reservationStatus is CANCELLED', async () => {
      mockPrisma.reservations.findMany.mockResolvedValue([
        {
          id: 1,
          user_id: 4,
          complex_id: 1,
          court_id: 7,
          date_ini: new Date(),
          date_end: new Date(),
          status: ReservationAvailabilityStatus.CANCELLED,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 2,
          user_id: 4,
          complex_id: 1,
          court_id: 7,
          date_ini: new Date(),
          date_end: new Date(),
          status: ReservationAvailabilityStatus.EMPTY,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]);
      mockUtilitiesService.getTimeFilterFromDate.mockReturnValue(
        ReservationTimeFilter.PAST,
      );
      mockCourtsStatusService.getCourtStatus.mockResolvedValue({
        statusData: { status: CourtStatus.OPEN },
      });
      mockUtilitiesService.getReservationStatus.mockReturnValue(
        ReservationStatus.CANCELLED,
      );

      const result = await service.getReservations({
        reservationStatus: ReservationStatus.CANCELLED,
      });

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(ReservationAvailabilityStatus.CANCELLED);
    });
  });

  describe('single reservation getters', () => {
    it('throws when no reservation is found by id', async () => {
      jest.spyOn(service, 'getReservations').mockResolvedValue([]);

      await expect(service.getReservation(7)).rejects.toThrow(NotFoundException);
    });

    it('throws when multiple reservations are found by id', async () => {
      jest.spyOn(service, 'getReservations').mockResolvedValue([
        {} as any,
        {} as any,
      ]);

      await expect(service.getReservation(7)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('delegates user reservations to getReservations', async () => {
      const spy = jest.spyOn(service, 'getReservations').mockResolvedValue([]);

      await service.getUserReservations(4, { timeFilter: ReservationTimeFilter.UPCOMING });

      expect(spy).toHaveBeenCalledWith(
        { userId: 4, timeFilter: ReservationTimeFilter.UPCOMING },
        false,
      );
    });

    it('delegates complex reservations to getReservations', async () => {
      const spy = jest.spyOn(service, 'getReservations').mockResolvedValue([]);

      await service.getComplexReservations(1, { timeFilter: ReservationTimeFilter.PAST });

      expect(spy).toHaveBeenCalledWith(
        { complexId: 1, timeFilter: ReservationTimeFilter.PAST },
        false,
      );
    });
  });

  describe('createReservation', () => {
    it('throws when reservation data is invalid', async () => {
      jest.spyOn(service, 'validateCourt').mockResolvedValue(false);

      await expect(
        service.createReservation(1, {
          userId: 4,
          courtId: 7,
          dateIni: new Date('2026-03-14T10:00:00Z'),
          dateEnd: new Date('2026-03-14T11:00:00Z'),
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates a reservation and returns a scheduled dto', async () => {
      jest.spyOn(service, 'validateCourt').mockResolvedValue(true);
      mockPrisma.complexes.findUnique.mockResolvedValue({
        id: 1,
        time_ini: new Date('1970-01-01T08:00:00Z'),
        time_end: new Date('1970-01-01T22:00:00Z'),
      });
      jest.spyOn(service as any, 'isValidDate').mockReturnValue(true);
      mockPrisma.reservations.create.mockResolvedValue({
        id: 1,
        user_id: 4,
        court_id: 7,
        date_ini: new Date('2026-03-14T10:00:00Z'),
        date_end: new Date('2026-03-14T11:00:00Z'),
        status: ReservationAvailabilityStatus.EMPTY,
        created_at: new Date(),
        updated_at: new Date(),
      });
      mockUtilitiesService.getTimeFilterFromDate.mockReturnValue(
        ReservationTimeFilter.UPCOMING,
      );

      const result = await service.createReservation(1, {
        userId: 4,
        courtId: 7,
        dateIni: new Date('2026-03-14T10:00:00Z'),
        dateEnd: new Date('2026-03-14T11:00:00Z'),
      } as any);

      expect(result.reservationStatus).toBe(ReservationStatus.SCHEDULED);
      expect(result.timeFilter).toBe(ReservationTimeFilter.UPCOMING);
    });
  });

  describe('updateReservation', () => {
    it('updates a reservation and recalculates the derived status', async () => {
      mockPrisma.complexes.findUnique.mockResolvedValue({
        id: 1,
        time_ini: new Date('1970-01-01T08:00:00Z'),
        time_end: new Date('1970-01-01T22:00:00Z'),
      });
      jest.spyOn(service, 'getReservation').mockResolvedValue({
        complexId: 1,
      } as any);
      jest.spyOn(service, 'validateCourt').mockResolvedValue(true);
      jest.spyOn(service as any, 'isValidDate').mockReturnValue(true);
      mockPrisma.reservations.update.mockResolvedValue({
        id: 1,
        user_id: 4,
        complex_id: 1,
        court_id: 7,
        date_ini: new Date('2026-03-14T10:00:00Z'),
        date_end: new Date('2026-03-14T11:00:00Z'),
        status: ReservationAvailabilityStatus.EMPTY,
        created_at: new Date(),
        updated_at: new Date(),
      });
      mockUtilitiesService.getTimeFilterFromDate.mockReturnValue(
        ReservationTimeFilter.UPCOMING,
      );
      mockCourtsStatusService.getCourtStatus.mockResolvedValue({
        statusData: { status: CourtStatus.OPEN },
      });
      mockUtilitiesService.getReservationStatus.mockReturnValue(
        ReservationStatus.SCHEDULED,
      );

      const result = await service.updateReservation(1, {
        courtId: 7,
        dateIni: new Date('2026-03-14T10:00:00Z'),
        dateEnd: new Date('2026-03-14T11:00:00Z'),
      } as any);

      expect(mockErrorsService.noBodyError).toHaveBeenCalled();
      expect(result.reservationStatus).toBe(ReservationStatus.SCHEDULED);
    });
  });

  describe('deleteReservation', () => {
    it('marks a reservation as deleted', async () => {
      await expect(service.deleteReservation(1)).resolves.toBeNull();

      expect(mockPrisma.reservations.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({
          is_delete: true,
        }),
      });
    });
  });
});
