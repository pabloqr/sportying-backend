import { InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ErrorsService } from '../../../src/common/errors.service';
import { UtilitiesService } from '../../../src/common/utilities.service';
import { CourtsService } from '../../../src/courts/courts.service';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { SportsService } from '../../../src/sports/sports.service';
import { WeatherService } from '../../../src/weather/weather.service';
import { ComplexesService } from '../../../src/complexes/complexes.service';

const mockPrisma = {
  complexes: {
    findMany: jest.fn(),
    upsert: jest.fn(),
    update: jest.fn(),
  },
};

const mockErrorsService = {
  noBodyError: jest.fn(),
  dbError: jest.fn(),
};

const mockUtilitiesService = {
  stringToDate: jest.fn((value: string) => new Date(`2024-06-01T${value}:00`)),
};

const mockWeatherService = {
  getWeatherFromGeohash: jest.fn(),
  getWeatherFromCoordinates: jest.fn(),
};

const mockSportsService = {
  getComplexSports: jest.fn(),
};

const mockCourtsService = {
  getCourtsAvailability: jest.fn(),
};

describe('ComplexesService', () => {
  let service: ComplexesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComplexesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ErrorsService, useValue: mockErrorsService },
        { provide: UtilitiesService, useValue: mockUtilitiesService },
        { provide: WeatherService, useValue: mockWeatherService },
        { provide: SportsService, useValue: mockSportsService },
        { provide: CourtsService, useValue: mockCourtsService },
      ],
    }).compile();

    service = module.get<ComplexesService>(ComplexesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns complexes enriched with sports and weather', async () => {
    mockPrisma.complexes.findMany.mockResolvedValue([
      {
        id: 1,
        complex_name: 'Club',
        time_ini: new Date('2024-06-01T08:00:00Z'),
        time_end: new Date('2024-06-01T22:00:00Z'),
        loc_latitude: 40.4,
        loc_longitude: -3.7,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
    mockSportsService.getComplexSports.mockResolvedValue([{ key: 'padel' }]);
    mockWeatherService.getWeatherFromGeohash.mockResolvedValue({
      alertLevel: 0,
    });

    const result = await service.getComplexes({});

    expect(result).toHaveLength(1);
    expect(result[0].sports).toEqual(['padel']);
  });

  it('throws when no complex is found', async () => {
    jest.spyOn(service, 'getComplexes').mockResolvedValue([]);

    await expect(service.getComplex(1)).rejects.toThrow(NotFoundException);
  });

  it('throws when multiple complexes are found', async () => {
    jest.spyOn(service, 'getComplexes').mockResolvedValue([{} as any, {} as any]);

    await expect(service.getComplex(1)).rejects.toThrow(InternalServerErrorException);
  });

  it('creates or restores a complex and enriches it with weather', async () => {
    mockPrisma.complexes.upsert.mockResolvedValue({
      id: 1,
      complex_name: 'Club',
      time_ini: new Date('2024-06-01T08:00:00Z'),
      time_end: new Date('2024-06-01T22:00:00Z'),
      loc_latitude: 40.4,
      loc_longitude: -3.7,
      created_at: new Date(),
      updated_at: new Date(),
    });
    mockWeatherService.getWeatherFromCoordinates.mockResolvedValue({
      alertLevel: 0,
    });

    const result = await service.createComplex({
      complexName: 'Club',
      timeIni: '08:00',
      timeEnd: '22:00',
      locLatitude: 40.4,
      locLongitude: -3.7,
    } as any);

    expect(mockPrisma.complexes.upsert).toHaveBeenCalled();
    expect(result.id).toBe(1);
  });

  it('updates a complex and returns the enriched dto', async () => {
    mockPrisma.complexes.update.mockResolvedValue({
      id: 1,
      complex_name: 'Updated',
      time_ini: new Date('2024-06-01T09:00:00Z'),
      time_end: new Date('2024-06-01T21:00:00Z'),
      loc_latitude: 40.4,
      loc_longitude: -3.7,
      created_at: new Date(),
      updated_at: new Date(),
    });
    mockWeatherService.getWeatherFromCoordinates.mockResolvedValue({
      alertLevel: 1,
    });

    const result = await service.updateComplex(1, { complexName: 'Updated' } as any);

    expect(mockErrorsService.noBodyError).toHaveBeenCalled();
    expect(result.id).toBe(1);
  });

  it('marks the complex as deleted', async () => {
    await expect(service.deleteComplex(1)).resolves.toBeNull();

    expect(mockPrisma.complexes.update).toHaveBeenCalled();
  });

  it('returns complex time from getComplex', async () => {
    jest.spyOn(service, 'getComplex').mockResolvedValue({
      timeIni: new Date('2024-06-01T08:00:00Z'),
      timeEnd: new Date('2024-06-01T22:00:00Z'),
    } as any);

    await expect(service.getComplexTime(1)).resolves.toEqual({
      timeIni: new Date('2024-06-01T08:00:00Z'),
      timeEnd: new Date('2024-06-01T22:00:00Z'),
    });
  });

  it('delegates complex availability to CourtsService', async () => {
    mockCourtsService.getCourtsAvailability.mockResolvedValue([{ id: 1 }]);

    await expect(service.getComplexAvailability(1)).resolves.toEqual([{ id: 1 }]);
  });
});
