import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '../../../prisma/generated/client';
import { ErrorsService } from '../../../src/common/errors.service';

function buildKnownError(code: string) {
  const error = Object.create(Prisma.PrismaClientKnownRequestError.prototype);
  error.code = code;
  return error;
}

function buildUnknownError() {
  return Object.create(Prisma.PrismaClientUnknownRequestError.prototype);
}

describe('ErrorsService', () => {
  let service: ErrorsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ErrorsService],
    }).compile();

    service = module.get<ErrorsService>(ErrorsService);
  });

  describe('noBodyError', () => {
    it('throws BadRequestException when dto is undefined', () => {
      expect(() => service.noBodyError(undefined)).toThrow(BadRequestException);
    });

    it('uses the provided context message when dto is undefined', () => {
      expect(() => service.noBodyError(undefined, 'Custom message')).toThrow('Custom message');
    });

    it('does not throw when dto is defined', () => {
      expect(() => service.noBodyError({ name: 'ok' })).not.toThrow();
    });
  });

  describe('dbError', () => {
    it('maps P2002 to ConflictException', () => {
      expect(() => service.dbError(buildKnownError('P2002'))).toThrow(ConflictException);
    });

    it('maps P2003 to ConflictException', () => {
      expect(() => service.dbError(buildKnownError('P2003'))).toThrow(ConflictException);
    });

    it('maps P2025 to NotFoundException', () => {
      expect(() => service.dbError(buildKnownError('P2025'))).toThrow(NotFoundException);
    });

    it('maps unknown prisma request errors to InternalServerErrorException', () => {
      expect(() => service.dbError(buildUnknownError())).toThrow(InternalServerErrorException);
    });

    it('uses custom context messages when provided', () => {
      expect(() => service.dbError(buildKnownError('P2002'), { p2002: 'Duplicated data.' })).toThrow(
        'Duplicated data.',
      );
    });

    it('does nothing for non-prisma errors', () => {
      expect(() => service.dbError(new Error('plain'))).not.toThrow();
    });
  });
});
