import { Test, TestingModule } from '@nestjs/testing';
import { DeviceTelemetrySlotDto } from 'src/common/dto';
import { UtilitiesService } from 'src/common/utilities.service';
import { CourtsStatusService } from 'src/courts-status/courts-status.service';
import { NotificationsService } from 'src/notifications/notifications.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ReservationsStatusService } from 'src/reservations-status/reservations-status.service';
import { AnalysisService, WeatherData } from '../../../src/common/analysis.service';
import { CourtStatus } from '../../../src/courts/enums';
import { ReservationAvailabilityStatus } from '../../../src/reservations/enums';

//--------------------------------------------------------------------------------------------------------------------//
// Helpers
//--------------------------------------------------------------------------------------------------------------------//

/**
 * Builds a minimal WeatherData object with safe, neutral defaults.
 * Individual tests override only the fields they care about.
 */
function buildWeatherData(overrides: Partial<WeatherData> = {}): WeatherData {
  return {
    temperatureCurr: 20,
    relativeHumidityCurr: 50,
    cloudCoverCurr: 0.5,
    windSpeedCurr: 10,
    windGustsCurr: 15,
    rainCurr: 0,
    showersCurr: 0,
    rain15Min: [0, 0, 0, 0],
    precipitation15Min: [0, 0, 0, 0],
    surfaceWaterPrev: 0,
    precipitationProbabilityNext: 0,
    alertLevelPrev: 0,
    alertLevelTicksPrev: 0,
    ...overrides,
  };
}

//--------------------------------------------------------------------------------------------------------------------//
// Mock factories
//--------------------------------------------------------------------------------------------------------------------//

const mockPrisma = {
  reservations: {
    findMany: jest.fn(),
  },
};

const mockUtilitiesService = {
  dateIsBetween: jest.fn(),
  dateIsEqualOrGreater: jest.fn(),
};

const mockCourtsStatusService = {
  getCourtStatus: jest.fn(),
  setCourtStatus: jest.fn(),
};

const mockReservationsStatusService = {
  setReservationStatus: jest.fn(),
};

const mockNotificationsService = {
  notifyReservationChange: jest.fn(),
  notifyCourtStatusChange: jest.fn(),
};

//--------------------------------------------------------------------------------------------------------------------//
// Test suite
//--------------------------------------------------------------------------------------------------------------------//

describe('AnalysisService', () => {
  let service: AnalysisService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalysisService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: UtilitiesService, useValue: mockUtilitiesService },
        { provide: CourtsStatusService, useValue: mockCourtsStatusService },
        { provide: ReservationsStatusService, useValue: mockReservationsStatusService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<AnalysisService>(AnalysisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateHumidityFactor (private)', () => {
    const calc = (rh: number) => (service as any).calculateHumidityFactor(rh);

    it('returns 1 when relative humidity is 0% (completely dry)', () => {
      // (1 - 0/100)^0.7 = 1^0.7 = 1
      expect(calc(0)).toBeCloseTo(1, 5);
    });

    it('returns the minimum floor (0.15) when humidity is 100%', () => {
      // (1 - 100/100)^0.7 = 0 --> clamped to 0.15
      expect(calc(100)).toBeCloseTo(0.15, 5);
    });

    it('returns a value between 0.15 and 1 for mid-range humidity', () => {
      const result = calc(50);
      expect(result).toBeGreaterThanOrEqual(0.15);
      expect(result).toBeLessThanOrEqual(1);
    });

    it('produces a lower factor as humidity increases (monotonically decreasing)', () => {
      const low = calc(30);
      const high = calc(70);
      expect(low).toBeGreaterThan(high);
    });
  });

  describe('calculateTemperatureFactor (private)', () => {
    const calc = (t: number) => (service as any).calculateTemperatureFactor(t);

    it('returns a value less than 1 for temperatures well below the threshold (15 ºC)', () => {
      // tanh((0 - 15)/10) is strongly negative --> factor < 1
      expect(calc(0)).toBeLessThan(1);
    });

    it('returns approximately 1 at the threshold temperature (15 ºC)', () => {
      // tanh(0) = 0 --> 1 + 0.45 * 0 * ... ≈ 1
      expect(calc(15)).toBeCloseTo(1, 1);
    });

    it('returns approximately 1 for temperatures well above the threshold', () => {
      expect(calc(35)).toBeCloseTo(1, 1);
    });
  });

  describe('calculateWindFactor (private)', () => {
    const calc = (speed: number, gusts: number) => (service as any).calculateWindFactor(speed, gusts);

    it('returns 1 when there is no wind at all', () => {
      // log(1+0)/log(1+25) = 0 → factor = 1 + 0.6 * 0 = 1
      expect(calc(0, 0)).toBeCloseTo(1, 5);
    });

    it('returns a value greater than 1 when there is wind', () => {
      expect(calc(20, 30)).toBeGreaterThan(1);
    });

    it('produces a higher factor when gusts are stronger', () => {
      const withLowGusts = calc(20, 20);
      const withHighGusts = calc(20, 50);
      expect(withHighGusts).toBeGreaterThan(withLowGusts);
    });

    it('increases monotonically with wind speed', () => {
      const slow = calc(10, 15);
      const fast = calc(40, 50);
      expect(fast).toBeGreaterThan(slow);
    });
  });

  describe('calculateCloudCoverFactor (private)', () => {
    const calc = (cover: number) => (service as any).calculateCloudCoverFactor(cover);

    it('returns 1.2 when the sky is completely clear (0% cover)', () => {
      // 1 + 0.2 * (1 - 0) = 1.2
      expect(calc(0)).toBeCloseTo(1.2, 5);
    });

    it('returns 1.0 when the sky is fully overcast (100% cover)', () => {
      // 1 + 0.2 * (1 - 1) = 1.0
      expect(calc(1)).toBeCloseTo(1.0, 5);
    });

    it('returns an intermediate value for partial cloud cover', () => {
      // 1 + 0.2 * (1 - 0.5) = 1.1
      expect(calc(0.5)).toBeCloseTo(1.1, 5);
    });

    it('decreases monotonically as cloud cover increases', () => {
      expect(calc(0.2)).toBeGreaterThan(calc(0.8));
    });
  });

  describe('calculateAlertLevel (private)', () => {
    /**
     * Shorthand: all non-hysteresis defaults set to 0 / "prev level 0, 0 ticks"
     * so each test overrides only the variable it exercises.
     */
    const calc = (
      intensity: number,
      intensitySum: number,
      surfaceWater: number,
      tEstimated: number,
      precipProbNext: number,
      alertLevelPrev = 0,
      alertLevelTicksPrev = 0,
    ) =>
      (service as any).calculateAlertLevel(
        intensity,
        intensitySum,
        surfaceWater,
        tEstimated,
        precipProbNext,
        alertLevelPrev,
        alertLevelTicksPrev,
      );

    // Raw level = 2 conditions
    it('returns level 2 when current intensity exceeds 0.05 mm/15 min', () => {
      const result = calc(0.1, 0, 0, 0, 0);
      expect(result.alertLevel).toBe(2);
      expect(result.alertLevelTicks).toBe(0);
    });

    it('returns level 2 when surface water exceeds critical threshold (0.35 mm)', () => {
      const result = calc(0, 0, 0.4, 0, 0);
      expect(result.alertLevel).toBe(2);
    });

    it('returns level 2 when tEstimated is >= 60 min', () => {
      const result = calc(0, 0, 0, 60, 0);
      expect(result.alertLevel).toBe(2);
    });

    // Raw level = 1 conditions
    it('returns level 1 when accumulated intensity >= 0.1 mm (but no level-2 trigger)', () => {
      const result = calc(0, 0.15, 0, 0, 0);
      expect(result.alertLevel).toBe(1);
    });

    it('returns level 1 when 0 < tEstimated <= 30 min', () => {
      const result = calc(0, 0, 0, 25, 0);
      expect(result.alertLevel).toBe(1);
    });

    it('returns level 1 when precipitation probability for next hour >= 60%', () => {
      const result = calc(0, 0, 0, 0, 60);
      expect(result.alertLevel).toBe(1);
    });

    // Raw level = 0
    it('returns level 0 when all conditions are benign', () => {
      const result = calc(0, 0, 0, 0, 0);
      expect(result.alertLevel).toBe(0);
      expect(result.alertLevelTicks).toBe(0);
    });

    // Hysteresis - rising
    it('applies a rise immediately (level 0 → 2) and resets ticks', () => {
      const result = calc(0.1, 0, 0, 0, 0, /* prev */ 0, /* ticks */ 1);
      expect(result.alertLevel).toBe(2);
      expect(result.alertLevelTicks).toBe(0);
    });

    // Hysteresis - equal
    it('keeps the current level unchanged and resets ticks when rawLevel === prevLevel', () => {
      const result = calc(0, 0, 0, 0, 0, /* prev */ 0, /* ticks */ 1);
      expect(result.alertLevel).toBe(0);
      expect(result.alertLevelTicks).toBe(0);
    });

    // Hysteresis - falling but ticks not yet reached
    it('holds the previous level on the first downward tick (ticks < 2)', () => {
      // prevLevel = 2, raw = 0 → should not drop yet after 1 tick
      const result = calc(0, 0, 0, 0, 0, /* prev */ 2, /* ticks */ 0);
      expect(result.alertLevel).toBe(2);
      expect(result.alertLevelTicks).toBe(1);
    });

    // Hysteresis - falling with enough ticks
    it('drops the level once 2 consecutive lower ticks have been counted', () => {
      // prevLevel = 2, raw = 0, ticks already at 1 → new ticks = 2 ≥ threshold
      const result = calc(0, 0, 0, 0, 0, /* prev */ 2, /* ticks */ 1);
      expect(result.alertLevel).toBe(0);
      expect(result.alertLevelTicks).toBe(0);
    });
  });

  describe('processWeatherData', () => {
    it('returns surfaceWater=0 and early alertLevel when current intensity exceeds threshold', async () => {
      // rainCurr=0.1 + wShowers(1.6)*showersCurr(0) = 0.1 > 0.05
      const weather = buildWeatherData({ rainCurr: 0.1 });
      const result = await service.processWeatherData(weather);

      expect(result.surfaceWater).toBe(0);
      expect(result.estimatedDryingTime).toBe(0);
      // Level 2 because intensity (0.1) >= intensityThreshold (0.05)
      expect(result.alertLevel).toBe(2);
    });

    it('returns surfaceWater=0 when intensity is low AND accumulated sum is below threshold', async () => {
      // intensity = 0, all rain15Min = 0 → intensitySum = 0 < 0.1
      const weather = buildWeatherData();
      const result = await service.processWeatherData(weather);

      expect(result.surfaceWater).toBe(0);
      expect(result.estimatedDryingTime).toBe(0);
    });

    it('calculates real surfaceWater and estimatedDryingTime when accumulated sum exceeds threshold', async () => {
      const weather = buildWeatherData({
        rainCurr: 0,
        showersCurr: 0,
        // Sum > 0.1 so the full calculation path is triggered
        rain15Min: [0.05, 0.05, 0.05, 0.05],
        precipitation15Min: [0.05, 0.05, 0.05, 0.05],
        temperatureCurr: 25,
        relativeHumidityCurr: 40,
        windSpeedCurr: 20,
        windGustsCurr: 30,
        cloudCoverCurr: 0.3,
        surfaceWaterPrev: 0,
        precipitationProbabilityNext: 0,
        alertLevelPrev: 0,
        alertLevelTicksPrev: 0,
      });

      const result = await service.processWeatherData(weather);

      // The exact value depends on the formula; we verify structural correctness.
      expect(result.surfaceWater).toBeGreaterThanOrEqual(0);
      expect(result.estimatedDryingTime).toBeGreaterThanOrEqual(20); // clamp min = tMin
      expect(typeof result.alertLevel).toBe('number');
      expect(typeof result.alertLevelTicks).toBe('number');
    });

    it('clamps estimatedDryingTime to tMax (240 min) when input conditions are extreme', async () => {
      const weather = buildWeatherData({
        rain15Min: [5, 5, 5, 5],
        precipitation15Min: [5, 5, 5, 5],
        // Worst-case drying conditions
        relativeHumidityCurr: 99,
        temperatureCurr: 0,
        windSpeedCurr: 0,
        windGustsCurr: 0,
        cloudCoverCurr: 1,
        surfaceWaterPrev: 5,
      });

      const result = await service.processWeatherData(weather);
      expect(result.estimatedDryingTime).toBeLessThanOrEqual(240);
    });
  });

  describe('processAvailabilityTelemetry', () => {
    const timestamp = new Date('2024-06-01T10:30:00Z');
    const courtId = 1;

    const baseReservation = {
      id: 42,
      court_id: courtId,
      complex_id: 10,
      date_ini: new Date('2024-06-01T10:00:00Z'),
      date_end: new Date('2024-06-01T11:00:00Z'),
    };

    it('does nothing when no reservation is active at the given timestamp', async () => {
      mockPrisma.reservations.findMany.mockResolvedValue([baseReservation]);
      mockUtilitiesService.dateIsBetween.mockReturnValue(false); // no match

      await service.processAvailabilityTelemetry(false, timestamp, courtId);

      expect(mockReservationsStatusService.setReservationStatus).not.toHaveBeenCalled();
      expect(mockNotificationsService.notifyReservationChange).not.toHaveBeenCalled();
    });

    it('sets status to OCCUPIED and notifies when court becomes unavailable', async () => {
      mockPrisma.reservations.findMany.mockResolvedValue([baseReservation]);
      mockUtilitiesService.dateIsBetween.mockReturnValue(true);
      mockReservationsStatusService.setReservationStatus.mockResolvedValue(undefined);

      await service.processAvailabilityTelemetry(false, timestamp, courtId);

      expect(mockReservationsStatusService.setReservationStatus).toHaveBeenCalledWith(
        baseReservation.id,
        ReservationAvailabilityStatus.OCCUPIED,
      );
      expect(mockNotificationsService.notifyReservationChange).toHaveBeenCalledWith(
        baseReservation.complex_id,
        baseReservation.id,
        ReservationAvailabilityStatus.OCCUPIED,
      );
    });

    it('does nothing when court is available but less than 15 min have passed since start', async () => {
      mockPrisma.reservations.findMany.mockResolvedValue([baseReservation]);
      mockUtilitiesService.dateIsBetween.mockReturnValue(true);
      // dateIsEqualOrGreater returns false → not enough time has passed
      mockUtilitiesService.dateIsEqualOrGreater.mockReturnValue(false);

      await service.processAvailabilityTelemetry(true, timestamp, courtId);

      expect(mockReservationsStatusService.setReservationStatus).not.toHaveBeenCalled();
    });

    it('sets status to CANCELLED and notifies when court is available and >= 15 min have elapsed', async () => {
      mockPrisma.reservations.findMany.mockResolvedValue([baseReservation]);
      mockUtilitiesService.dateIsBetween.mockReturnValue(true);
      mockUtilitiesService.dateIsEqualOrGreater.mockReturnValue(true);
      mockReservationsStatusService.setReservationStatus.mockResolvedValue(undefined);

      await service.processAvailabilityTelemetry(true, timestamp, courtId);

      expect(mockReservationsStatusService.setReservationStatus).toHaveBeenCalledWith(
        baseReservation.id,
        ReservationAvailabilityStatus.CANCELLED,
      );
      expect(mockNotificationsService.notifyReservationChange).toHaveBeenCalledWith(
        baseReservation.complex_id,
        baseReservation.id,
        ReservationAvailabilityStatus.CANCELLED,
      );
    });

    it('throws and propagates when prisma.findMany rejects', async () => {
      mockPrisma.reservations.findMany.mockRejectedValue(new Error('DB error'));

      await expect(service.processAvailabilityTelemetry(false, timestamp, courtId)).rejects.toThrow('DB error');
    });

    it('throws and propagates when setReservationStatus rejects', async () => {
      mockPrisma.reservations.findMany.mockResolvedValue([baseReservation]);
      mockUtilitiesService.dateIsBetween.mockReturnValue(true);
      mockReservationsStatusService.setReservationStatus.mockRejectedValue(new Error('Status update failed'));

      await expect(service.processAvailabilityTelemetry(false, timestamp, courtId)).rejects.toThrow(
        'Status update failed',
      );
    });
  });

  describe('processRainTelemetry', () => {
    const complexId = 10;
    const courtIds = [1, 2];

    const mockStatusOpen = { statusData: { status: CourtStatus.OPEN } };
    const mockStatusWeather = { statusData: { status: CourtStatus.WEATHER } };

    it('sets status to WEATHER when rainIntensity >= 2.5', async () => {
      mockCourtsStatusService.getCourtStatus.mockResolvedValue(mockStatusOpen);
      mockCourtsStatusService.setCourtStatus.mockResolvedValue(undefined);

      await service.processRainTelemetry(complexId, null, 2.5, [1]);

      expect(mockCourtsStatusService.setCourtStatus).toHaveBeenCalledWith(complexId, 1, {
        status: CourtStatus.WEATHER,
      });
      expect(mockNotificationsService.notifyCourtStatusChange).toHaveBeenCalledWith(complexId, 1, CourtStatus.WEATHER);
    });

    it('sets status to WEATHER when previous telemetry has a value > 0', async () => {
      const previousTelemetry: DeviceTelemetrySlotDto = {
        value: 1.0,
        createdAt: new Date(),
      } as DeviceTelemetrySlotDto;

      mockCourtsStatusService.getCourtStatus.mockResolvedValue(mockStatusOpen);
      mockCourtsStatusService.setCourtStatus.mockResolvedValue(undefined);

      await service.processRainTelemetry(complexId, previousTelemetry, 0, [1]);

      expect(mockCourtsStatusService.setCourtStatus).toHaveBeenCalledWith(complexId, 1, {
        status: CourtStatus.WEATHER,
      });
    });

    it('sets status to OPEN when previous telemetry value is 0.0', async () => {
      const previousTelemetry: DeviceTelemetrySlotDto = {
        value: 0.0,
        createdAt: new Date(),
      } as DeviceTelemetrySlotDto;

      mockCourtsStatusService.getCourtStatus.mockResolvedValue(mockStatusWeather);
      mockCourtsStatusService.setCourtStatus.mockResolvedValue(undefined);

      await service.processRainTelemetry(complexId, previousTelemetry, 0, [1]);

      expect(mockCourtsStatusService.setCourtStatus).toHaveBeenCalledWith(complexId, 1, { status: CourtStatus.OPEN });
      expect(mockNotificationsService.notifyCourtStatusChange).toHaveBeenCalledWith(complexId, 1, CourtStatus.OPEN);
    });

    it('sets status to OPEN when previous telemetry is <= 2.5 and >= 30 min old', async () => {
      const thirtyOneMinutesAgo = new Date(Date.now() - 31 * 60 * 1000);
      const previousTelemetry: DeviceTelemetrySlotDto = {
        value: 0.0,
        createdAt: thirtyOneMinutesAgo,
      } as DeviceTelemetrySlotDto;

      mockUtilitiesService.dateIsEqualOrGreater.mockReturnValue(true);
      mockCourtsStatusService.getCourtStatus.mockResolvedValue(mockStatusWeather);
      mockCourtsStatusService.setCourtStatus.mockResolvedValue(undefined);

      await service.processRainTelemetry(complexId, previousTelemetry, 0, [1]);

      expect(mockCourtsStatusService.setCourtStatus).toHaveBeenCalledWith(complexId, 1, { status: CourtStatus.OPEN });
    });

    it('does NOT call setCourtStatus when the status has not changed', async () => {
      mockCourtsStatusService.getCourtStatus.mockResolvedValue(mockStatusWeather);

      await service.processRainTelemetry(complexId, null, 2.5, [1]);

      expect(mockCourtsStatusService.setCourtStatus).not.toHaveBeenCalled();
      expect(mockNotificationsService.notifyCourtStatusChange).not.toHaveBeenCalled();
    });

    it('iterates over all courtIds and processes each independently', async () => {
      mockCourtsStatusService.getCourtStatus.mockResolvedValue(mockStatusOpen);
      mockCourtsStatusService.setCourtStatus.mockResolvedValue(undefined);

      await service.processRainTelemetry(complexId, null, 2.5, courtIds);

      expect(mockCourtsStatusService.getCourtStatus).toHaveBeenCalledTimes(courtIds.length);
      expect(mockCourtsStatusService.setCourtStatus).toHaveBeenCalledTimes(courtIds.length);
    });

    it('throws and propagates when getCourtStatus rejects', async () => {
      mockCourtsStatusService.getCourtStatus.mockRejectedValue(new Error('Court not found'));

      await expect(service.processRainTelemetry(complexId, null, 2.5, [1])).rejects.toThrow('Court not found');
    });

    it('throws and propagates when setCourtStatus rejects', async () => {
      mockCourtsStatusService.getCourtStatus.mockResolvedValue(mockStatusOpen);
      mockCourtsStatusService.setCourtStatus.mockRejectedValue(new Error('Set failed'));

      await expect(service.processRainTelemetry(complexId, null, 2.5, [1])).rejects.toThrow('Set failed');
    });
  });
});
