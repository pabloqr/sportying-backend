import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

interface ErrorContext {
  p2002?: string;
  p2025?: string;
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
          throw new ConflictException(ctx?.p2002 ?? 'Conflict Exception');
        case 'P2025':
          throw new NotFoundException(ctx?.p2025 ?? 'Not Found Exception');
      }
    }
  }
}
