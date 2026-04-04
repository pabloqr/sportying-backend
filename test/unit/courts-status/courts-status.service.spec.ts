import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ErrorsService } from '../../../src/common/errors.service';
import { CourtsStatusService } from '../../../src/courts-status/courts-status.service';
import { CourtStatus } from '../../../src/courts/enums';
import { PrismaService } from '../../../src/prisma/prisma.service';

//--------------------------------------------------------------------------------------------------------------------//
// Mock factories
//--------------------------------------------------------------------------------------------------------------------//

const mockPrisma = {
  courts_status: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
};

const mockErrorsService = {
  noBodyError: jest.fn(),
  dbError: jest.fn(),
};

//--------------------------------------------------------------------------------------------------------------------//
// Test suite
//--------------------------------------------------------------------------------------------------------------------//

describe('CourtsStatusService', () => {
  let service: CourtsStatusService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CourtsStatusService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ErrorsService, useValue: mockErrorsService },
      ],
    }).compile();

    service = module.get<CourtsStatusService>(CourtsStatusService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCourtStatus', () => {
    it('returns the latest stored court status when present', async () => {
      mockPrisma.courts_status.findFirst.mockResolvedValue({
        court_id: 2,
        status: CourtStatus.BLOCKED,
        alert_level: 1,
        estimated_drying_time: 40,
        created_at: new Date(),
      });

      const result = await service.getCourtStatus(1, 2);

      expect(result.statusData.status).toBe(CourtStatus.BLOCKED);
      expect(result.statusData.alertLevel).toBe(1);
    });

    it('returns OPEN as default when no status exists', async () => {
      mockPrisma.courts_status.findFirst.mockResolvedValue(null);

      const result = await service.getCourtStatus(1, 2);

      expect(result.statusData.status).toBe(CourtStatus.OPEN);
      expect(result.statusData.alertLevel).toBe(0);
    });
  });

  describe('setCourtStatus', () => {
    it('returns the previous status when nothing changes', async () => {
      jest.spyOn(service, 'getCourtStatus').mockResolvedValue({
        complexId: 1,
        courtId: 2,
        statusData: {
          status: CourtStatus.OPEN,
          alertLevel: 0,
          estimatedDryingTime: 0,
        },
      } as any);

      const result = await service.setCourtStatus(1, 2, {
        status: CourtStatus.OPEN,
        alertLevel: 0,
      });

      expect(mockPrisma.courts_status.create).not.toHaveBeenCalled();
      expect(result.statusData.status).toBe(CourtStatus.OPEN);
    });

    it('forces WEATHER when alert level is >= 2 and status is active', async () => {
      jest.spyOn(service, 'getCourtStatus').mockResolvedValue({
        complexId: 1,
        courtId: 2,
        statusData: {
          status: CourtStatus.OPEN,
          alertLevel: 0,
          estimatedDryingTime: 0,
        },
      } as any);
      mockPrisma.courts_status.create.mockResolvedValue({
        court_id: 2,
        status: CourtStatus.WEATHER,
        alert_level: 2,
        estimated_drying_time: 50,
        created_at: new Date(),
      });

      const result = await service.setCourtStatus(1, 2, {
        status: CourtStatus.OPEN,
        alertLevel: 2,
        estimatedDryingTime: 50,
      });

      expect(mockPrisma.courts_status.create).toHaveBeenCalledWith({
        data: {
          court_id: 2,
          status: CourtStatus.WEATHER,
          alert_level: 2,
          estimated_drying_time: 50,
          created_at: expect.any(Date),
        },
      });
      expect(result.statusData.status).toBe(CourtStatus.WEATHER);
      expect(result.statusData.alertLevel).toBe(2);
    });

    it('delegates prisma errors to ErrorsService and rethrows them', async () => {
      const error = new Error('db');
      jest.spyOn(service, 'getCourtStatus').mockRejectedValue(error);

      await expect(service.setCourtStatus(1, 2, { status: CourtStatus.OPEN })).rejects.toThrow(error);
      expect(mockErrorsService.dbError).toHaveBeenCalled();
    });

    it('throws when setCourtStatus receives no body', async () => {
      const bodyError = new BadRequestException('No properties to update.');
      mockErrorsService.noBodyError.mockImplementationOnce(() => {
        throw bodyError;
      });

      await expect(service.setCourtStatus(1, 2, undefined as any)).rejects.toThrow(bodyError);
      expect(mockPrisma.courts_status.create).not.toHaveBeenCalled();
    });

    it('throws the mapped error when creating court status fails', async () => {
      const error = new Error('db');
      const mappedError = new NotFoundException('Court with ID 2 not found.');
      jest.spyOn(service, 'getCourtStatus').mockResolvedValue({
        complexId: 1,
        courtId: 2,
        statusData: {
          status: CourtStatus.OPEN,
          alertLevel: 0,
          estimatedDryingTime: 0,
        },
      } as any);
      mockPrisma.courts_status.create.mockRejectedValue(error);
      mockErrorsService.dbError.mockImplementationOnce(() => {
        throw mappedError;
      });

      await expect(service.setCourtStatus(1, 2, { status: CourtStatus.BLOCKED })).rejects.toThrow(mappedError);
      expect(mockErrorsService.dbError).toHaveBeenCalledWith(error, {
        p2025: 'Court with ID 2 not found.',
      });
    });
  });
});
