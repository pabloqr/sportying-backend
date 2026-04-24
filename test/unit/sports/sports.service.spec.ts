import { InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma/prisma.service';
import { SportsService } from 'src/sports/sports.service';

//--------------------------------------------------------------------------------------------------------------------//
// Mock factories
//--------------------------------------------------------------------------------------------------------------------//

const mockPrisma = {
  courts: {
    findMany: jest.fn(),
  },
  sports: {
    findMany: jest.fn(),
  },
};

//--------------------------------------------------------------------------------------------------------------------//
// Test suite
//--------------------------------------------------------------------------------------------------------------------//

describe('SportsService', () => {
  let service: SportsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SportsService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<SportsService>(SportsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('getComplexSports', () => {
    it('returns unique sports available in the complex and applies dto key filters', async () => {
      mockPrisma.courts.findMany.mockResolvedValue([
        { sport_key: 'tennis' },
        { sport_key: 'tennis' },
        { sport_key: 'padel' },
      ]);
      mockPrisma.sports.findMany.mockResolvedValue([
        { key: 'tennis', min_people: 2, max_people: 4, created_at: new Date(), updated_at: new Date() },
      ]);

      const result = await service.getComplexSports(1, { keys: ['tennis'] });

      expect(mockPrisma.courts.findMany).toHaveBeenCalledWith({
        where: { complex_id: 1 },
      });
      expect(mockPrisma.sports.findMany).toHaveBeenCalledWith({
        where: {
          key: { in: ['tennis'] },
          is_delete: false,
        },
      });
      expect(result).toHaveLength(1);
      expect(result).toEqual([expect.objectContaining({ key: 'tennis' })]);
    });

    it('returns all unique complex sports when dto.keys is not provided', async () => {
      mockPrisma.courts.findMany.mockResolvedValue([{ sport_key: 'tennis' }, { sport_key: 'padel' }]);
      mockPrisma.sports.findMany.mockResolvedValue([
        { key: 'tennis', min_people: 2, max_people: 4, created_at: new Date(), updated_at: new Date() },
        { key: 'padel', min_people: 2, max_people: 4, created_at: new Date(), updated_at: new Date() },
      ]);

      const result = await service.getComplexSports(1, { minPeople: 2, maxPeople: 4 });

      expect(mockPrisma.sports.findMany).toHaveBeenCalledWith({
        where: {
          key: { in: ['tennis', 'padel'] },
          min_people: 2,
          max_people: 4,
          is_delete: false,
        },
      });
      expect(result).toHaveLength(2);
    });

    it('queries sports with an empty key list when the complex has no courts', async () => {
      mockPrisma.courts.findMany.mockResolvedValue([]);
      mockPrisma.sports.findMany.mockResolvedValue([]);

      const result = await service.getComplexSports(1, {});

      expect(mockPrisma.sports.findMany).toHaveBeenCalledWith({
        where: {
          key: { in: [] },
          is_delete: false,
        },
      });
      expect(result).toEqual([]);
    });
  });

  describe('getSports', () => {
    it('filters deleted sports by default and maps to dto instances', async () => {
      mockPrisma.sports.findMany.mockResolvedValue([
        { key: 'padel', min_people: 2, max_people: 4, created_at: new Date(), updated_at: new Date() },
      ]);

      const result = await service.getSports({});

      expect(mockPrisma.sports.findMany).toHaveBeenCalledWith({
        where: { is_delete: false },
        select: {
          key: true,
          min_people: true,
          max_people: true,
          created_at: true,
          updated_at: true,
        },
        orderBy: [],
      });
      expect(result).toEqual([expect.objectContaining({ key: 'padel' })]);
    });

    it('forwards people filters and ordering to prisma', async () => {
      mockPrisma.sports.findMany.mockResolvedValue([]);

      await service.getSports({
        minPeople: 2,
        maxPeople: 4,
        orderParams: [{ field: 'maxPeople', order: 'desc' }],
      } as any);

      expect(mockPrisma.sports.findMany).toHaveBeenCalledWith({
        where: {
          is_delete: false,
          min_people: 2,
          max_people: 4,
        },
        select: {
          key: true,
          min_people: true,
          max_people: true,
          created_at: true,
          updated_at: true,
        },
        orderBy: [{ max_people: 'desc' }],
      });
    });

    it('keeps deleted filter disabled when checkDeleted is true and filters keys in memory', async () => {
      mockPrisma.sports.findMany.mockResolvedValue([
        { key: 'padel', min_people: 2, max_people: 4, created_at: new Date(), updated_at: new Date() },
        { key: 'tennis', min_people: 2, max_people: 4, created_at: new Date(), updated_at: new Date() },
      ]);

      const result = await service.getSports({ keys: ['tennis'] }, true);

      expect(mockPrisma.sports.findMany).toHaveBeenCalledWith({
        where: {},
        select: {
          key: true,
          min_people: true,
          max_people: true,
          created_at: true,
          updated_at: true,
        },
        orderBy: [],
      });
      expect(result).toHaveLength(1);
      expect(result).toEqual([expect.objectContaining({ key: 'tennis' })]);
    });
  });

  describe('getSport', () => {
    it('throws NotFoundException when no sport matches the key', async () => {
      jest.spyOn(service, 'getSports').mockResolvedValue([]);

      await expect(service.getSport('tennis')).rejects.toThrow(NotFoundException);
    });

    it('throws InternalServerErrorException when multiple sports match the key', async () => {
      jest.spyOn(service, 'getSports').mockResolvedValue([{ key: 'tennis' } as any, { key: 'tennis' } as any]);

      await expect(service.getSport('tennis')).rejects.toThrow(InternalServerErrorException);
    });

    it('returns the sport when exactly one match is found', async () => {
      jest.spyOn(service, 'getSports').mockResolvedValue([{ key: 'tennis' } as any]);

      await expect(service.getSport('tennis')).resolves.toEqual({ key: 'tennis' });
      expect(service.getSports).toHaveBeenCalledWith({ keys: ['tennis'] });
    });
  });
});
