import { Test, TestingModule } from '@nestjs/testing';
import { UtilitiesService } from 'src/common/utilities.service';
import { CourtStatus } from 'src/courts/enums';
import { ReservationAvailabilityStatus, ReservationStatus, ReservationTimeFilter } from 'src/reservations/enums';

//--------------------------------------------------------------------------------------------------------------------//
// Test suite
//--------------------------------------------------------------------------------------------------------------------//

describe('UtilitiesService', () => {
  let service: UtilitiesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UtilitiesService],
    }).compile();

    service = module.get<UtilitiesService>(UtilitiesService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('dateIsBetween', () => {
    const start = new Date('2024-06-01T10:00:00Z');
    const end = new Date('2024-06-01T11:00:00Z');

    it('returns true when the date falls strictly between start and end', () => {
      const date = new Date('2024-06-01T10:30:00Z');
      expect(service.dateIsBetween(date, start, end)).toBe(true);
    });

    it('returns true when the date equals the start boundary', () => {
      expect(service.dateIsBetween(start, start, end)).toBe(true);
    });

    it('returns true when the date equals the end boundary', () => {
      expect(service.dateIsBetween(end, start, end)).toBe(true);
    });

    it('returns false when the date is outside the range', () => {
      const date = new Date('2024-06-01T11:00:01Z');
      expect(service.dateIsBetween(date, start, end)).toBe(false);
    });
  });

  describe('dateIsEqualOrLower', () => {
    it('returns true when the absolute difference is lower than the threshold', () => {
      const dateA = new Date('2024-06-01T10:00:00Z');
      const dateB = new Date('2024-06-01T10:09:00Z');

      expect(service.dateIsEqualOrLower(10, dateA, dateB)).toBe(true);
    });

    it('returns true when the absolute difference equals the threshold', () => {
      const dateA = new Date('2024-06-01T10:00:00Z');
      const dateB = new Date('2024-06-01T10:10:00Z');

      expect(service.dateIsEqualOrLower(10, dateA, dateB)).toBe(true);
    });

    it('returns false when the absolute difference exceeds the threshold', () => {
      const dateA = new Date('2024-06-01T10:00:00Z');
      const dateB = new Date('2024-06-01T10:11:00Z');

      expect(service.dateIsEqualOrLower(10, dateA, dateB)).toBe(false);
    });
  });

  describe('dateIsEqualOrGreater', () => {
    it('returns false when the absolute difference is lower than the threshold', () => {
      const dateA = new Date('2024-06-01T10:00:00Z');
      const dateB = new Date('2024-06-01T10:09:00Z');

      expect(service.dateIsEqualOrGreater(10, dateA, dateB)).toBe(false);
    });

    it('returns true when the absolute difference equals the threshold', () => {
      const dateA = new Date('2024-06-01T10:00:00Z');
      const dateB = new Date('2024-06-01T10:10:00Z');

      expect(service.dateIsEqualOrGreater(10, dateA, dateB)).toBe(true);
    });

    it('returns true when the absolute difference exceeds the threshold', () => {
      const dateA = new Date('2024-06-01T10:00:00Z');
      const dateB = new Date('2024-06-01T10:11:00Z');

      expect(service.dateIsEqualOrGreater(10, dateA, dateB)).toBe(true);
    });
  });

  describe('timeIsEqualOrLower', () => {
    it('returns true when dateA time is before dateB time', () => {
      const dateA = new Date('2024-06-01T09:45:00');
      const dateB = new Date('2024-06-01T10:00:00');

      expect(service.timeIsEqualOrLower(dateA, dateB)).toBe(true);
    });

    it('returns true when both times are equal', () => {
      const dateA = new Date('2024-06-01T10:00:00');
      const dateB = new Date('2024-06-02T10:00:00');

      expect(service.timeIsEqualOrLower(dateA, dateB)).toBe(true);
    });

    it('returns false when dateA time is after dateB time', () => {
      const dateA = new Date('2024-06-01T10:15:00');
      const dateB = new Date('2024-06-01T10:00:00');

      expect(service.timeIsEqualOrLower(dateA, dateB)).toBe(false);
    });
  });

  describe('timeIsEqualOrGreater', () => {
    it('returns false when dateA time is before dateB time', () => {
      const dateA = new Date('2024-06-01T09:45:00');
      const dateB = new Date('2024-06-01T10:00:00');

      expect(service.timeIsEqualOrGreater(dateA, dateB)).toBe(false);
    });

    it('returns true when both times are equal', () => {
      const dateA = new Date('2024-06-01T10:00:00');
      const dateB = new Date('2024-06-02T10:00:00');

      expect(service.timeIsEqualOrGreater(dateA, dateB)).toBe(true);
    });

    it('returns true when dateA time is after dateB time', () => {
      const dateA = new Date('2024-06-01T10:15:00');
      const dateB = new Date('2024-06-01T10:00:00');

      expect(service.timeIsEqualOrGreater(dateA, dateB)).toBe(true);
    });
  });

  describe('stringToDate', () => {
    it('converts an HH:mm string into a Date with the expected hours and minutes', () => {
      const result = service.stringToDate('14:35');

      expect(result.getHours()).toBe(14);
      expect(result.getMinutes()).toBe(35);
      expect(result.getSeconds()).toBe(0);
      expect(result.getMilliseconds()).toBe(0);
    });
  });

  describe('getTimeBlock', () => {
    it('rounds the start down to the previous half-hour and the end up to the next half-hour', () => {
      jest.useFakeTimers().setSystemTime(new Date('2024-06-01T10:12:00'));

      const result = service.getTimeBlock();

      expect(result.dateIni.getHours()).toBe(10);
      expect(result.dateIni.getMinutes()).toBe(0);
      expect(result.dateEnd.getHours()).toBe(11);
      expect(result.dateEnd.getMinutes()).toBe(30);
    });

    it('handles crossing into the next hour when current minutes are >= 30', () => {
      jest.useFakeTimers().setSystemTime(new Date('2024-06-01T10:45:00'));

      const result = service.getTimeBlock(60);

      expect(result.dateIni.getHours()).toBe(10);
      expect(result.dateIni.getMinutes()).toBe(30);
      expect(result.dateEnd.getHours()).toBe(12);
      expect(result.dateEnd.getMinutes()).toBe(0);
    });

    it('supports custom durations', () => {
      jest.useFakeTimers().setSystemTime(new Date('2024-06-01T10:05:00'));

      const result = service.getTimeBlock(15);

      expect(result.dateIni.getHours()).toBe(10);
      expect(result.dateIni.getMinutes()).toBe(0);
      expect(result.dateEnd.getHours()).toBe(10);
      expect(result.dateEnd.getMinutes()).toBe(30);
    });
  });

  describe('groupArrayByField', () => {
    it('groups items by the provided field preserving insertion order within each group', () => {
      const items = [
        { id: 1, type: 'A', value: 'first' },
        { id: 2, type: 'B', value: 'second' },
        { id: 3, type: 'A', value: 'third' },
      ];

      const result = service.groupArrayByField(items, 'type');

      expect(result.get('A')).toEqual([
        { id: 1, type: 'A', value: 'first' },
        { id: 3, type: 'A', value: 'third' },
      ]);
      expect(result.get('B')).toEqual([{ id: 2, type: 'B', value: 'second' }]);
    });

    it('returns an empty map when the input array is empty', () => {
      const result = service.groupArrayByField([], 'length');

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
    });
  });

  describe('getTimeFilterFromDate', () => {
    it('returns PAST when the date is earlier than now', () => {
      jest.useFakeTimers().setSystemTime(new Date('2024-06-01T10:00:00Z'));

      const result = service.getTimeFilterFromDate(new Date('2024-06-01T09:59:59Z'));

      expect(result).toBe(ReservationTimeFilter.PAST);
    });

    it('returns UPCOMING when the date equals now', () => {
      jest.useFakeTimers().setSystemTime(new Date('2024-06-01T10:00:00Z'));

      const result = service.getTimeFilterFromDate(new Date('2024-06-01T10:00:00Z'));

      expect(result).toBe(ReservationTimeFilter.UPCOMING);
    });

    it('returns UPCOMING when the date is in the future', () => {
      jest.useFakeTimers().setSystemTime(new Date('2024-06-01T10:00:00Z'));

      const result = service.getTimeFilterFromDate(new Date('2024-06-01T10:00:01Z'));

      expect(result).toBe(ReservationTimeFilter.UPCOMING);
    });
  });

  describe('getReservationStatus', () => {
    it('returns SCHEDULED for upcoming reservations when the court is OPEN', () => {
      const result = service.getReservationStatus(
        ReservationAvailabilityStatus.EMPTY,
        CourtStatus.OPEN,
        ReservationTimeFilter.UPCOMING,
      );

      expect(result).toBe(ReservationStatus.SCHEDULED);
    });

    it('returns WEATHER for upcoming reservations when the court is WEATHER', () => {
      const result = service.getReservationStatus(
        ReservationAvailabilityStatus.EMPTY,
        CourtStatus.WEATHER,
        ReservationTimeFilter.UPCOMING,
      );

      expect(result).toBe(ReservationStatus.WEATHER);
    });

    it('returns CANCELLED for upcoming reservations when the court is BLOCKED', () => {
      const result = service.getReservationStatus(
        ReservationAvailabilityStatus.EMPTY,
        CourtStatus.BLOCKED,
        ReservationTimeFilter.UPCOMING,
      );

      expect(result).toBe(ReservationStatus.CANCELLED);
    });

    it('returns CANCELLED for upcoming reservations when the court is in MAINTENANCE', () => {
      const result = service.getReservationStatus(
        ReservationAvailabilityStatus.EMPTY,
        CourtStatus.MAINTENANCE,
        ReservationTimeFilter.UPCOMING,
      );

      expect(result).toBe(ReservationStatus.CANCELLED);
    });

    it('returns CANCELLED for past reservations with CANCELLED availability status', () => {
      const result = service.getReservationStatus(
        ReservationAvailabilityStatus.CANCELLED,
        CourtStatus.OPEN,
        ReservationTimeFilter.PAST,
      );

      expect(result).toBe(ReservationStatus.CANCELLED);
    });

    it('returns COMPLETED for past reservations with non-cancelled availability status', () => {
      const result = service.getReservationStatus(
        ReservationAvailabilityStatus.OCCUPIED,
        CourtStatus.OPEN,
        ReservationTimeFilter.PAST,
      );

      expect(result).toBe(ReservationStatus.COMPLETED);
    });

    it('keeps the default SCHEDULED value when time filter is ALL', () => {
      const result = service.getReservationStatus(
        ReservationAvailabilityStatus.EMPTY,
        CourtStatus.BLOCKED,
        ReservationTimeFilter.ALL,
      );

      expect(result).toBe(ReservationStatus.SCHEDULED);
    });
  });
});
