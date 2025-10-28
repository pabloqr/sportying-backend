import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

interface ErrorContext {
  p2002?: string;
  p2003?: string;
  p2025?: string;
  unknown?: string;
}

@Injectable()
export class ErrorsService {
  public noBodyError(dto: any, ctx?: string) {
    if (dto === undefined) {
      throw new BadRequestException(ctx ?? 'No properties to update.');
    }
  }

  public dbError(error: any, ctx?: ErrorContext) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2002':
          throw new ConflictException(
            ctx?.p2002 ?? 'Unique constraint failed.',
          );
        case 'P2003':
          throw new ConflictException(
            ctx?.p2003 ?? 'Foreign key constraint failed.',
          );
        case 'P2025':
          throw new NotFoundException(
            ctx?.p2025 ?? 'One or more required records were not found.',
          );
      }
    } else if (error instanceof Prisma.PrismaClientUnknownRequestError) {
      throw new InternalServerErrorException(
        ctx?.unknown ?? 'Could not create database entry.',
      );
    }
  }
}
