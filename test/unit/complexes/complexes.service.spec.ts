import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { OrderBy } from 'src/common/enums';
import { ComplexOrderField } from 'src/complexes/dto';
import { Prisma } from '../../../prisma/generated/client';
import { ErrorsService } from '../../../src/common/errors.service';
import { UtilitiesService } from '../../../src/common/utilities.service';
import { ComplexesService } from '../../../src/complexes/complexes.service';
import { CourtsService } from '../../../src/courts/courts.service';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { SportsService } from '../../../src/sports/sports.service';
import { WeatherService } from '../../../src/weather/weather.service';

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
  stringToDate: jest.fn(),
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
    jest.resetAllMocks();
    mockUtilitiesService.stringToDate.mockImplementation((value: string) => new Date(`2024-06-01T${value}:00`));

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
    jest.resetAllMocks();
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

    const result = await service.getComplexes({ orderParams: [{ field: ComplexOrderField.ID, order: OrderBy.ASC }] });

    expect(result).toHaveLength(1);
    expect(result[0].sports).toEqual(['padel']);
  });

  it('reuses cached weather data for complexes sharing the same geohash', async () => {
    mockPrisma.complexes.findMany.mockResolvedValue([
      {
        id: 1,
        complex_name: 'Club A',
        time_ini: new Date('2024-06-01T08:00:00Z'),
        time_end: new Date('2024-06-01T22:00:00Z'),
        loc_latitude: 40.4168,
        loc_longitude: -3.7038,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 2,
        complex_name: 'Club B',
        time_ini: new Date('2024-06-01T08:00:00Z'),
        time_end: new Date('2024-06-01T22:00:00Z'),
        loc_latitude: 40.4168,
        loc_longitude: -3.7038,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
    mockSportsService.getComplexSports.mockResolvedValue([]);
    mockWeatherService.getWeatherFromGeohash.mockResolvedValue({ alertLevel: 0 });

    const result = await service.getComplexes({});

    expect(result).toHaveLength(2);
    expect(mockWeatherService.getWeatherFromGeohash).toHaveBeenCalledTimes(1);
  });

  it('includes deleted complexes when checkDeleted is true', async () => {
    mockPrisma.complexes.findMany.mockResolvedValue([]);

    await service.getComplexes({}, true);

    expect(mockPrisma.complexes.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
      }),
    );
  });

  describe('getComplex', () => {
    it('throws when no complex is found', async () => {
      jest.spyOn(service, 'getComplexes').mockResolvedValue([]);

      await expect(service.getComplex(1)).rejects.toThrow(NotFoundException);
    });

    it('throws when multiple complexes are found', async () => {
      jest.spyOn(service, 'getComplexes').mockResolvedValue([{} as any, {} as any]);

      await expect(service.getComplex(1)).rejects.toThrow(InternalServerErrorException);
    });

    it('returns a complex enriched with sports and weather', async () => {
      const mockComplex = {
        id: 1,
        complexName: 'Club',
        timeIni: '09:00',
        timeEnd: '23:00',
        locLatitude: 40.4,
        locLongitude: -3.7,
        sports: [],
        weather: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      jest.spyOn(service, 'getComplexes').mockResolvedValue([mockComplex]);

      const result = await service.getComplex(1);

      expect(result).toEqual(mockComplex);
      expect(service.getComplexes).toHaveBeenCalledTimes(1);
      expect(service.getComplexes).toHaveBeenCalledWith({ id: 1 });
    });
  });

  describe('createComplex', () => {
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

    it('throws the mapped error when prisma upsert fails', async () => {
      const prismaError = new Error('upsert failed');
      const mappedError = new ConflictException('Complex already exists.');
      mockPrisma.complexes.upsert.mockRejectedValue(prismaError);
      mockErrorsService.dbError.mockImplementation(() => {
        throw mappedError;
      });

      await expect(
        service.createComplex({
          complexName: 'Club',
          timeIni: '08:00',
          timeEnd: '22:00',
          locLatitude: 40.4,
          locLongitude: -3.7,
        } as any),
      ).rejects.toThrow(mappedError);

      expect(mockErrorsService.dbError).toHaveBeenCalledWith(prismaError, {
        p2025: 'Complex already exists.',
      });
    });

    it('rethrows the original error when dbError does not map it', async () => {
      const prismaError = new Error('upsert failed');
      mockPrisma.complexes.upsert.mockRejectedValue(prismaError);

      await expect(
        service.createComplex({
          complexName: 'Club',
          timeIni: '08:00',
          timeEnd: '22:00',
          locLatitude: 40.4,
          locLongitude: -3.7,
        } as any),
      ).rejects.toBe(prismaError);
    });
  });

  describe('updateComplex', () => {
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

    it('throws when the update body is missing', async () => {
      const bodyError = new BadRequestException('No properties to update.');
      mockErrorsService.noBodyError.mockImplementation(() => {
        throw bodyError;
      });

      await expect(service.updateComplex(1, undefined as any)).rejects.toThrow(bodyError);
      expect(mockPrisma.complexes.update).not.toHaveBeenCalled();
    });

    it('throws the mapped error when prisma update fails', async () => {
      const prismaError = new Error('update failed');
      const mappedError = new NotFoundException('Complex with ID 1 not found.');
      mockPrisma.complexes.update.mockRejectedValue(prismaError);
      mockErrorsService.dbError.mockImplementation(() => {
        throw mappedError;
      });

      await expect(service.updateComplex(1, { complexName: 'Updated' } as any)).rejects.toThrow(mappedError);

      expect(mockErrorsService.dbError).toHaveBeenCalledWith(prismaError, {
        p2025: 'Complex with ID 1 not found.',
      });
    });

    it('rethrows the original error when update fails with a non-mapped error', async () => {
      const prismaError = new Error('update failed');
      mockPrisma.complexes.update.mockRejectedValue(prismaError);

      await expect(service.updateComplex(1, { complexName: 'Updated' } as any)).rejects.toBe(prismaError);
    });
  });

  describe('deleteComplex', () => {
    it('marks the complex as deleted', async () => {
      await expect(service.deleteComplex(1)).resolves.toBeNull();

      expect(mockPrisma.complexes.update).toHaveBeenCalled();
    });

    it('throws the mapped error when prisma delete fails', async () => {
      const prismaError = new Error('delete failed');
      const mappedError = new NotFoundException('Complex with ID 1 not found.');
      mockPrisma.complexes.update.mockRejectedValue(prismaError);
      mockErrorsService.dbError.mockImplementation(() => {
        throw mappedError;
      });

      await expect(service.deleteComplex(1)).rejects.toThrow(mappedError);
      expect(mockErrorsService.dbError).toHaveBeenCalledWith(prismaError, {
        p2025: 'Complex with ID 1 not found.',
      });
    });

    it('rethrows the original error when delete fails with a non-mapped error', async () => {
      const prismaError = new Error('delete failed');
      mockPrisma.complexes.update.mockRejectedValue(prismaError);

      await expect(service.deleteComplex(1)).rejects.toBe(prismaError);
    });
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

  describe('setComplexTime', () => {
    it('returns only the updated time fields from updateComplex', async () => {
      const updatedComplex = {
        id: 1,
        complexName: 'Club',
        timeIni: new Date('2024-06-01T09:00:00Z'),
        timeEnd: new Date('2024-06-01T21:00:00Z'),
        locLatitude: 40.4,
        locLongitude: -3.7,
        sports: [],
        weather: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      jest.spyOn(service, 'updateComplex').mockResolvedValue(updatedComplex as any);

      await expect(service.setComplexTime(1, { timeIni: '09:00', timeEnd: '21:00' } as any)).resolves.toEqual({
        timeIni: updatedComplex.timeIni,
        timeEnd: updatedComplex.timeEnd,
      });

      expect(service.updateComplex).toHaveBeenCalledWith(1, { timeIni: '09:00', timeEnd: '21:00' });
    });

    it('propagates errors from updateComplex', async () => {
      const updateError = new NotFoundException('Complex with ID 1 not found.');
      jest.spyOn(service, 'updateComplex').mockRejectedValue(updateError);

      await expect(service.setComplexTime(1, { timeIni: '09:00' } as any)).rejects.toThrow(updateError);
    });
  });

  it('delegates complex availability to CourtsService', async () => {
    mockCourtsService.getCourtsAvailability.mockResolvedValue([{ id: 1 }]);

    await expect(service.getComplexAvailability(1)).resolves.toEqual([{ id: 1 }]);
  });
});
