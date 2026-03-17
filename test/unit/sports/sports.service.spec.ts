import { InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { SportsService } from '../../../src/sports/sports.service';

const mockPrisma = {
  courts: {
    findMany: jest.fn(),
  },
  sports: {
    findMany: jest.fn(),
  },
};

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

      expect(mockPrisma.sports.findMany).toHaveBeenCalledWith({
        where: {
          key: { in: ['tennis'] },
          is_delete: false,
        },
      });
      expect(result).toHaveLength(1);
      expect(result[0].key).toBe('tennis');
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
      expect(result[0].key).toBe('padel');
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
  });
});
