import { BadRequestException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ErrorsService } from '../../../src/common/errors.service.js';
import { UtilitiesService } from '../../../src/common/utilities.service.js';
import { CourtsStatusService } from '../../../src/courts-status/courts-status.service.js';
import { CourtStatus } from '../../../src/courts/enums/index.js';
import { PrismaService } from '../../../src/prisma/prisma.service.js';
import {
  ReservationAvailabilityStatus,
  ReservationStatus,
  ReservationTimeFilter,
} from '../../../src/reservations/enums/index.js';
import { ReservationsService } from '../../../src/reservations/reservations.service.js';

//--------------------------------------------------------------------------------------------------------------------//
// Mock factories
//--------------------------------------------------------------------------------------------------------------------//

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

//--------------------------------------------------------------------------------------------------------------------//
// Test suite
//--------------------------------------------------------------------------------------------------------------------//

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
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  describe('isValidDate', () => {
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

    it('rejects reservation windows when the initial date is not before the final date', () => {
      mockUtilitiesService.timeIsEqualOrGreater.mockReturnValue(true);
      mockUtilitiesService.timeIsEqualOrLower.mockReturnValue(true);

      const isValid = (service as any).isValidDate(
        new Date(2026, 2, 11, 8, 0, 0),
        new Date(2026, 2, 11, 22, 0, 0),
        new Date(2026, 2, 11, 11, 0, 0),
        new Date(2026, 2, 11, 11, 0, 0),
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

    it('returns false when the court is WEATHER and drying time has not elapsed', async () => {
      const dateIni = new Date('2026-03-13T10:00:00Z');
      mockPrisma.courts.findMany.mockResolvedValue([{ id: 7 }]);
      mockCourtsStatusService.getCourtStatus.mockResolvedValue({
        statusData: { status: CourtStatus.WEATHER, estimatedDryingTime: 30 },
      });
      mockUtilitiesService.dateIsEqualOrGreater.mockReturnValue(false);

      await expect(service.validateCourt(1, 7, dateIni)).resolves.toBe(false);
    });

    it('returns false when the court status is neither OPEN nor WEATHER', async () => {
      mockPrisma.courts.findMany.mockResolvedValue([{ id: 7 }]);
      mockCourtsStatusService.getCourtStatus.mockResolvedValue({
        statusData: { status: CourtStatus.BLOCKED, estimatedDryingTime: 0 },
      });

      await expect(service.validateCourt(1, 7, new Date())).resolves.toBe(false);
    });
  });

  describe('validateReservationData', () => {
    it('throws when the requested court is not valid', async () => {
      jest.spyOn(service, 'validateCourt').mockResolvedValue(false);

      await expect(
        (service as any).validateReservationData(1, {
          courtId: 7,
          dateIni: new Date('2026-03-14T10:00:00Z'),
          dateEnd: new Date('2026-03-14T11:00:00Z'),
        }),
      ).rejects.toThrow(new BadRequestException('Requested court is not valid.'));
    });

    it('throws when the complex is not found', async () => {
      jest.spyOn(service, 'validateCourt').mockResolvedValue(true);
      mockPrisma.complexes.findUnique.mockResolvedValue(null);

      await expect(
        (service as any).validateReservationData(1, {
          courtId: 7,
          dateIni: new Date('2026-03-14T10:00:00Z'),
          dateEnd: new Date('2026-03-14T11:00:00Z'),
        }),
      ).rejects.toThrow(new NotFoundException('Complex with ID 1 not found.'));
    });

    it('throws when the reservation dates are invalid', async () => {
      jest.spyOn(service, 'validateCourt').mockResolvedValue(true);
      mockPrisma.complexes.findUnique.mockResolvedValue({
        id: 1,
        time_ini: new Date('1970-01-01T08:00:00Z'),
        time_end: new Date('1970-01-01T22:00:00Z'),
      });
      jest.spyOn(service as any, 'isValidDate').mockReturnValue(false);

      await expect(
        (service as any).validateReservationData(1, {
          courtId: 7,
          dateIni: new Date('2026-03-14T10:00:00Z'),
          dateEnd: new Date('2026-03-14T11:00:00Z'),
        }),
      ).rejects.toThrow(new BadRequestException('Dates are not valid. Initial date must be previous to final date.'));
    });

    it('allows partial updates without validating dates when they are missing', async () => {
      mockPrisma.complexes.findUnique.mockResolvedValue({
        id: 1,
        time_ini: new Date('1970-01-01T08:00:00Z'),
        time_end: new Date('1970-01-01T22:00:00Z'),
      });

      await expect((service as any).validateReservationData(1, { userId: 4 })).resolves.toBeUndefined();
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
      mockUtilitiesService.getTimeFilterFromDate.mockReturnValue(ReservationTimeFilter.UPCOMING);
      mockCourtsStatusService.getCourtStatus.mockResolvedValue({
        statusData: { status: CourtStatus.OPEN },
      });
      mockUtilitiesService.getReservationStatus.mockReturnValue(ReservationStatus.SCHEDULED);

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

    it('forwards filters and ordering to prisma', async () => {
      mockPrisma.reservations.findMany.mockResolvedValue([]);

      await service.getReservations(
        {
          id: 1,
          userId: 4,
          complexId: 2,
          courtId: 7,
          dateIni: new Date('2026-03-14T10:00:00Z'),
          dateEnd: new Date('2026-03-14T11:00:00Z'),
          status: ReservationAvailabilityStatus.EMPTY,
          orderParams: [{ field: 'id', order: 'desc' }],
        } as any,
        true,
      );

      expect(mockPrisma.reservations.findMany).toHaveBeenCalledWith({
        where: {
          id: 1,
          user_id: 4,
          complex_id: 2,
          court_id: 7,
          date_ini: new Date('2026-03-14T10:00:00Z'),
          date_end: new Date('2026-03-14T11:00:00Z'),
          status: ReservationAvailabilityStatus.EMPTY,
        },
        select: {
          id: true,
          user_id: true,
          complex_id: true,
          court_id: true,
          date_ini: true,
          date_end: true,
          status: true,
          created_at: true,
          updated_at: true,
        },
        orderBy: [{ id: 'desc' }],
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

    it('applies the UPCOMING time filter in the prisma query', async () => {
      mockPrisma.reservations.findMany.mockResolvedValue([]);

      await service.getReservations({ timeFilter: ReservationTimeFilter.UPCOMING });

      expect(mockPrisma.reservations.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            is_delete: false,
            date_ini: expect.objectContaining({ gt: expect.any(Date) }),
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
      mockUtilitiesService.getTimeFilterFromDate.mockReturnValue(ReservationTimeFilter.PAST);
      mockCourtsStatusService.getCourtStatus.mockResolvedValue({
        statusData: { status: CourtStatus.OPEN },
      });
      mockUtilitiesService.getReservationStatus.mockReturnValue(ReservationStatus.CANCELLED);

      const result = await service.getReservations({
        reservationStatus: ReservationStatus.CANCELLED,
      });

      expect(result).toHaveLength(1);
      expect(result).toEqual([expect.objectContaining({ status: ReservationAvailabilityStatus.CANCELLED })]);
    });

    it('filters out cancelled reservations when reservationStatus is SCHEDULED', async () => {
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
      mockUtilitiesService.getTimeFilterFromDate.mockReturnValue(ReservationTimeFilter.UPCOMING);
      mockCourtsStatusService.getCourtStatus.mockResolvedValue({
        statusData: { status: CourtStatus.OPEN },
      });
      mockUtilitiesService.getReservationStatus.mockReturnValue(ReservationStatus.SCHEDULED);

      const result = await service.getReservations({
        reservationStatus: ReservationStatus.SCHEDULED,
      });

      expect(result).toHaveLength(1);
      expect(result).toEqual([expect.objectContaining({ id: 2 })]);
    });

    it('also filters out cancelled reservations when reservationStatus is WEATHER', async () => {
      mockPrisma.reservations.findMany.mockResolvedValue([
        {
          id: 1,
          user_id: 4,
          complex_id: 1,
          court_id: 7,
          date_ini: new Date(),
          date_end: new Date(),
          status: ReservationAvailabilityStatus.EMPTY,
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
          status: ReservationAvailabilityStatus.CANCELLED,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]);
      mockUtilitiesService.getTimeFilterFromDate.mockReturnValue(ReservationTimeFilter.UPCOMING);
      mockCourtsStatusService.getCourtStatus.mockResolvedValue({
        statusData: { status: CourtStatus.WEATHER },
      });
      mockUtilitiesService.getReservationStatus.mockReturnValue(ReservationStatus.WEATHER);

      const result = await service.getReservations({
        reservationStatus: ReservationStatus.WEATHER,
      });

      expect(result).toHaveLength(1);
      expect(result).toEqual([expect.objectContaining({ id: 1 })]);
    });
  });

  describe('getReservation', () => {
    it('throws when no reservation is found by id', async () => {
      jest.spyOn(service, 'getReservations').mockResolvedValue([]);

      await expect(service.getReservation(7)).rejects.toThrow(NotFoundException);
    });

    it('throws when multiple reservations are found by id', async () => {
      jest.spyOn(service, 'getReservations').mockResolvedValue([{} as any, {} as any]);

      await expect(service.getReservation(7)).rejects.toThrow(InternalServerErrorException);
    });

    it('returns the reservation when exactly one result is found', async () => {
      const reservation = {
        id: 7,
        complexId: 1,
      };
      jest.spyOn(service, 'getReservations').mockResolvedValue([reservation as any]);

      await expect(service.getReservation(7)).resolves.toEqual(reservation);
      expect(service.getReservations).toHaveBeenCalledWith({ id: 7 });
    });
  });

  describe('getUserReservations', () => {
    it('delegates user reservations to getReservations', async () => {
      const spy = jest.spyOn(service, 'getReservations').mockResolvedValue([]);

      await service.getUserReservations(4, { timeFilter: ReservationTimeFilter.UPCOMING });

      expect(spy).toHaveBeenCalledWith({ userId: 4, timeFilter: ReservationTimeFilter.UPCOMING }, false);
    });

    it('passes through checkDeleted when requested', async () => {
      const spy = jest.spyOn(service, 'getReservations').mockResolvedValue([]);

      await service.getUserReservations(4, { timeFilter: ReservationTimeFilter.UPCOMING }, true);

      expect(spy).toHaveBeenCalledWith({ userId: 4, timeFilter: ReservationTimeFilter.UPCOMING }, true);
    });
  });

  describe('getComplexReservations', () => {
    it('delegates complex reservations to getReservations', async () => {
      const spy = jest.spyOn(service, 'getReservations').mockResolvedValue([]);

      await service.getComplexReservations(1, { timeFilter: ReservationTimeFilter.PAST });

      expect(spy).toHaveBeenCalledWith({ complexId: 1, timeFilter: ReservationTimeFilter.PAST }, false);
    });

    it('passes through checkDeleted when requested', async () => {
      const spy = jest.spyOn(service, 'getReservations').mockResolvedValue([]);

      await service.getComplexReservations(1, { timeFilter: ReservationTimeFilter.PAST }, true);

      expect(spy).toHaveBeenCalledWith({ complexId: 1, timeFilter: ReservationTimeFilter.PAST }, true);
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

    it('throws when the complex is not found during reservation validation', async () => {
      jest.spyOn(service, 'validateCourt').mockResolvedValue(true);
      mockPrisma.complexes.findUnique.mockResolvedValue(null);

      await expect(
        service.createReservation(1, {
          userId: 4,
          courtId: 7,
          dateIni: new Date('2026-03-14T10:00:00Z'),
          dateEnd: new Date('2026-03-14T11:00:00Z'),
        } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws when reservation dates are invalid', async () => {
      jest.spyOn(service, 'validateCourt').mockResolvedValue(true);
      mockPrisma.complexes.findUnique.mockResolvedValue({
        id: 1,
        time_ini: new Date('1970-01-01T08:00:00Z'),
        time_end: new Date('1970-01-01T22:00:00Z'),
      });
      jest.spyOn(service as any, 'isValidDate').mockReturnValue(false);

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
      mockUtilitiesService.getTimeFilterFromDate.mockReturnValue(ReservationTimeFilter.UPCOMING);

      const result = await service.createReservation(1, {
        userId: 4,
        courtId: 7,
        dateIni: new Date('2026-03-14T10:00:00Z'),
        dateEnd: new Date('2026-03-14T11:00:00Z'),
      } as any);

      expect(mockPrisma.reservations.create).toHaveBeenCalledWith({
        data: {
          user_id: 4,
          complex_id: 1,
          court_id: 7,
          date_ini: new Date('2026-03-14T10:00:00Z'),
          date_end: new Date('2026-03-14T11:00:00Z'),
        },
        select: {
          id: true,
          user_id: true,
          court_id: true,
          date_ini: true,
          date_end: true,
          status: true,
          created_at: true,
          updated_at: true,
        },
      });
      expect(result.reservationStatus).toBe(ReservationStatus.SCHEDULED);
      expect(result.timeFilter).toBe(ReservationTimeFilter.UPCOMING);
    });

    it('throws the mapped error when createReservation fails', async () => {
      const error = new Error('db');
      const mappedError = new NotFoundException('Overlapping reservations.');
      jest.spyOn(service, 'validateCourt').mockResolvedValue(true);
      mockPrisma.complexes.findUnique.mockResolvedValue({
        id: 1,
        time_ini: new Date('1970-01-01T08:00:00Z'),
        time_end: new Date('1970-01-01T22:00:00Z'),
      });
      jest.spyOn(service as any, 'isValidDate').mockReturnValue(true);
      mockPrisma.reservations.create.mockRejectedValue(error);
      mockErrorsService.dbError.mockImplementationOnce(() => {
        throw mappedError;
      });

      await expect(
        service.createReservation(1, {
          userId: 4,
          courtId: 7,
          dateIni: new Date('2026-03-14T10:00:00Z'),
          dateEnd: new Date('2026-03-14T11:00:00Z'),
        } as any),
      ).rejects.toThrow(mappedError);
      expect(mockErrorsService.dbError).toHaveBeenCalledWith(error, {
        p2025: 'Overlapping reservations.',
      });
    });

    it('rethrows the original error when createReservation fails with a non-mapped error', async () => {
      const error = new Error('db');
      jest.spyOn(service, 'validateCourt').mockResolvedValue(true);
      mockPrisma.complexes.findUnique.mockResolvedValue({
        id: 1,
        time_ini: new Date('1970-01-01T08:00:00Z'),
        time_end: new Date('1970-01-01T22:00:00Z'),
      });
      jest.spyOn(service as any, 'isValidDate').mockReturnValue(true);
      mockPrisma.reservations.create.mockRejectedValue(error);

      await expect(
        service.createReservation(1, {
          userId: 4,
          courtId: 7,
          dateIni: new Date('2026-03-14T10:00:00Z'),
          dateEnd: new Date('2026-03-14T11:00:00Z'),
        } as any),
      ).rejects.toBe(error);
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
      mockUtilitiesService.getTimeFilterFromDate.mockReturnValue(ReservationTimeFilter.UPCOMING);
      mockCourtsStatusService.getCourtStatus.mockResolvedValue({
        statusData: { status: CourtStatus.OPEN },
      });
      mockUtilitiesService.getReservationStatus.mockReturnValue(ReservationStatus.SCHEDULED);

      const result = await service.updateReservation(1, {
        courtId: 7,
        dateIni: new Date('2026-03-14T10:00:00Z'),
        dateEnd: new Date('2026-03-14T11:00:00Z'),
      } as any);

      expect(mockErrorsService.noBodyError).toHaveBeenCalled();
      expect(result.reservationStatus).toBe(ReservationStatus.SCHEDULED);
    });

    it('throws when updateReservation receives no body', async () => {
      const bodyError = new BadRequestException('No properties to update.');
      mockErrorsService.noBodyError.mockImplementationOnce(() => {
        throw bodyError;
      });

      await expect(service.updateReservation(1, undefined as any)).rejects.toThrow(bodyError);
      expect(mockPrisma.reservations.update).not.toHaveBeenCalled();
    });

    it('throws when the updated reservation data is invalid', async () => {
      jest.spyOn(service, 'getReservation').mockResolvedValue({
        complexId: 1,
      } as any);
      jest
        .spyOn(service as any, 'validateReservationData')
        .mockRejectedValue(new BadRequestException('Requested court is not valid.'));

      await expect(service.updateReservation(1, { courtId: 7 } as any)).rejects.toThrow(BadRequestException);
      expect(mockPrisma.reservations.update).not.toHaveBeenCalled();
    });

    it('throws the mapped error when updateReservation fails', async () => {
      const error = new Error('db');
      const mappedError = new NotFoundException('Reservation with ID 1 not found.');
      jest.spyOn(service, 'getReservation').mockResolvedValue({
        complexId: 1,
      } as any);
      jest.spyOn(service as any, 'validateReservationData').mockResolvedValue(undefined);
      mockPrisma.reservations.update.mockRejectedValue(error);
      mockErrorsService.dbError.mockImplementationOnce(() => {
        throw mappedError;
      });

      await expect(service.updateReservation(1, { courtId: 7 } as any)).rejects.toThrow(mappedError);
      expect(mockErrorsService.dbError).toHaveBeenCalledWith(error, {
        p2025: 'Reservation with ID 1 not found.',
      });
    });

    it('rethrows the original error when updateReservation fails with a non-mapped error', async () => {
      const error = new Error('db');
      jest.spyOn(service, 'getReservation').mockResolvedValue({
        complexId: 1,
      } as any);
      jest.spyOn(service as any, 'validateReservationData').mockResolvedValue(undefined);
      mockPrisma.reservations.update.mockRejectedValue(error);

      await expect(service.updateReservation(1, { courtId: 7 } as any)).rejects.toBe(error);
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

    it('throws the mapped error when deleteReservation fails', async () => {
      const error = new Error('db');
      const mappedError = new NotFoundException('Reservation with ID 1 not found.');
      mockPrisma.reservations.update.mockRejectedValue(error);
      mockErrorsService.dbError.mockImplementationOnce(() => {
        throw mappedError;
      });

      await expect(service.deleteReservation(1)).rejects.toThrow(mappedError);
      expect(mockErrorsService.dbError).toHaveBeenCalledWith(error, {
        p2025: 'Reservation with ID 1 not found.',
      });
    });

    it('rethrows the original error when deleteReservation fails with a non-mapped error', async () => {
      const error = new Error('db');
      mockPrisma.reservations.update.mockRejectedValue(error);

      await expect(service.deleteReservation(1)).rejects.toBe(error);
    });
  });
});
