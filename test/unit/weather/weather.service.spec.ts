import { InternalServerErrorException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AnalysisService } from '../../../src/common/analysis.service';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { WeatherService } from '../../../src/weather/weather.service';

const mockPrisma = {
  weather: {
    findFirst: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn(),
  },
  complexes: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
};

const mockAnalysisService = {
  processWeatherData: jest.fn(),
};

describe('WeatherService', () => {
  let service: WeatherService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WeatherService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AnalysisService, useValue: mockAnalysisService },
      ],
    }).compile();

    service = module.get<WeatherService>(WeatherService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('maps raw weather to persistence dto format', () => {
    const result = (service as any).toWeatherDataDto({
      temperature_2m: 20,
      relative_humidity_2m: 50,
      cloud_cover: 30,
      wind_speed_10m: 10,
      wind_direction_10m: 90,
      wind_gusts_10m: 15,
      rain: 1,
      showers: 0.5,
      precip_probability_prev: 10,
      precip_probability_curr: 20,
      precip_probability_next: 30,
      precip_intensity_prev: 0.2,
      rain_15min: [0],
      precipitation_15min: [0],
    });

    expect(result.temperature_curr).toBe(20);
    expect(result.precip_probability_next).toBe(30);
  });

  it('maps raw weather to analysis format', () => {
    const result = (service as any).toWeatherData({
      temperature_2m: 20,
      relative_humidity_2m: 50,
      cloud_cover: 30,
      wind_speed_10m: 10,
      wind_direction_10m: 90,
      wind_gusts_10m: 15,
      rain: 1,
      showers: 0.5,
      precip_probability_prev: 10,
      precip_probability_curr: 20,
      precip_probability_next: 30,
      precip_intensity_prev: 0.2,
      rain_15min: [0],
      precipitation_15min: [0],
    });

    expect(result.temperatureCurr).toBe(20);
    expect(result.precipitationProbabilityNext).toBe(30);
  });

  it('returns cached weather from the database when present', async () => {
    mockPrisma.weather.findFirst.mockResolvedValue({
      temperature_curr: 20,
      relative_humidity_curr: 50,
      cloud_cover_curr: 30,
      wind_speed_curr: 10,
      wind_direction_curr: 90,
      precip_intensity_curr: 1,
      precip_probability_curr: 20,
      precip_probability_next: 30,
      alert_level: 1,
      estimated_drying_time: 40,
    });

    const result = await service.getWeatherFromGeohash('ezs42');

    expect(result.temperature_curr).toBe(20);
    expect(result.alert_level).toBe(1);
  });

  it('starts only one update request per geohash when data is missing', async () => {
    mockPrisma.weather.findFirst.mockResolvedValue(null);
    const sharedResult = { alertLevel: 0 };
    const updateSpy = jest.spyOn(service as any, 'updateWeather').mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve(sharedResult as any), 0);
        }),
    );

    const [first, second] = await Promise.all([
      service.getWeatherFromGeohash('ezs42'),
      service.getWeatherFromGeohash('ezs42'),
    ]);

    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(first).toBe(sharedResult);
    expect(second).toBe(sharedResult);
  });

  it('gets weather by coordinates through the geohash flow', async () => {
    jest.spyOn(service, 'getWeatherFromGeohash').mockResolvedValue({ alertLevel: 0 } as any);

    await expect(service.getWeatherFromCoordinates(40.4, -3.7)).resolves.toEqual({
      alertLevel: 0,
    });
  });

  it('loads the complex coordinates before fetching weather by id', async () => {
    mockPrisma.complexes.findUnique.mockResolvedValue({
      loc_latitude: 40.4,
      loc_longitude: -3.7,
    });
    jest.spyOn(service, 'getWeatherFromCoordinates').mockResolvedValue({ alertLevel: 0 } as any);

    await expect(service.getWeatherFromId(1)).resolves.toMatchObject({
      alert_level: 0,
    });
  });

  it('runs purge and update on module init', async () => {
    const purgeSpy = jest.spyOn(service as any, 'purgeWeatherLogic').mockResolvedValue(undefined);
    const updateSpy = jest.spyOn(service as any, 'updateWeatherLogic').mockResolvedValue(undefined);

    await service.onModuleInit();

    expect(purgeSpy).toHaveBeenCalled();
    expect(updateSpy).toHaveBeenCalled();
  });

  it('updates weather, persists the analysis result and returns the combined dto', async () => {
    jest.spyOn(service as any, 'fetchWeather').mockResolvedValue({
      temperature_2m: 20,
      relative_humidity_2m: 50,
      cloud_cover: 30,
      wind_speed_10m: 10,
      wind_direction_10m: 90,
      wind_gusts_10m: 15,
      rain: 1,
      showers: 0.5,
      precip_probability_prev: 10,
      precip_probability_curr: 20,
      precip_probability_next: 30,
      precip_intensity_prev: 0.2,
      rain_15min: [0],
      precipitation_15min: [0],
    });
    mockPrisma.weather.findFirst.mockResolvedValue({
      surface_water_prev: 3,
      alert_level: 1,
      alert_level_ticks: 2,
    });
    mockAnalysisService.processWeatherData.mockResolvedValue({
      surfaceWater: 5,
      estimatedDryingTime: 90,
      alertLevel: 2,
      alertLevelTicks: 3,
    });
    mockPrisma.weather.create.mockResolvedValue({});

    const result = await (service as any).updateWeather('ezs42');

    expect(mockAnalysisService.processWeatherData).toHaveBeenCalledWith(
      expect.objectContaining({
        surfaceWaterPrev: 3,
        alertLevelPrev: 1,
        alertLevelTicksPrev: 2,
      }),
    );
    expect(mockPrisma.weather.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        geohash: 'ezs42',
        surface_water_prev: 5,
        estimated_drying_time: 90,
        alert_level: 2,
        alert_level_ticks: 3,
      }),
    });
    expect(result.estimated_drying_time).toBe(90);
    expect(result.alert_level).toBe(2);
  });

  it('wraps update failures in InternalServerErrorException', async () => {
    jest.spyOn(service as any, 'fetchWeather').mockRejectedValue(new Error('api'));

    await expect((service as any).updateWeather('ezs42')).rejects.toThrow(InternalServerErrorException);
  });

  it('skips weather updates when there are no active complexes', async () => {
    mockPrisma.complexes.findMany.mockResolvedValue([]);
    const updateSpy = jest.spyOn(service as any, 'updateWeather').mockResolvedValue({} as any);

    await (service as any).updateWeatherLogic();

    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('updates each unique geohash only once for active complexes', async () => {
    mockPrisma.complexes.findMany.mockResolvedValue([
      { loc_latitude: 40.4, loc_longitude: -3.7 },
      { loc_latitude: 40.4001, loc_longitude: -3.7001 },
    ]);
    const updateSpy = jest.spyOn(service as any, 'updateWeather').mockResolvedValue({} as any);

    await (service as any).updateWeatherLogic();

    expect(updateSpy).toHaveBeenCalledTimes(1);
  });

  it('delegates cron handlers to their internal logic', async () => {
    const purgeSpy = jest.spyOn(service as any, 'purgeWeatherLogic').mockResolvedValue(undefined);
    const updateSpy = jest.spyOn(service as any, 'updateWeatherLogic').mockResolvedValue(undefined);

    await service.handleWeatherUpdate();
    await service.handleWeatherPurge();

    expect(updateSpy).toHaveBeenCalled();
    expect(purgeSpy).toHaveBeenCalled();
  });

  it('wraps purge failures in InternalServerErrorException', async () => {
    mockPrisma.weather.deleteMany.mockRejectedValue(new Error('db'));

    await expect((service as any).purgeWeatherLogic()).rejects.toThrow(InternalServerErrorException);
  });

  it('clears pending requests when an update fails', async () => {
    mockPrisma.weather.findFirst.mockResolvedValue(null);
    jest.spyOn(service as any, 'updateWeather').mockRejectedValue(new InternalServerErrorException('boom'));

    await expect(service.getWeatherFromGeohash('ezs42')).rejects.toThrow(InternalServerErrorException);
    expect((service as any).activeRequests.has('ezs42')).toBe(false);
  });

  it('propagates the complex lookup bug when getWeatherFromId receives an unknown id', async () => {
    mockPrisma.complexes.findUnique.mockResolvedValue(null);

    await expect(service.getWeatherFromId(999)).rejects.toThrow(TypeError);
  });
});
