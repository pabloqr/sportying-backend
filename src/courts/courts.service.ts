import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ErrorsService } from '../common/errors.service';
import {
  CreateCourtAvailabilityDto,
  CreateCourtDto,
  CreateCourtStatusDto,
  GetCourtsDto,
  UpdateCourtDto,
} from './dto';
import { Prisma } from '@prisma/client';
import {
  ResponseCourtAvailabilityDto,
  ResponseCourtDto,
  ResponseCourtStatusDto,
} from '../common/dto';
import { Status } from './enums';

@Injectable()
export class CourtsService {
  constructor(
    private prisma: PrismaService,
    private errorsService: ErrorsService,
  ) {}

  async getCourts(
    complexId: number,
    dto: GetCourtsDto,
    checkDeleted: boolean = false,
  ): Promise<Array<ResponseCourtDto>> {
    // Se construye el objeto 'where' para establecer las condiciones de la consulta
    const where: Prisma.courtsWhereInput = {
      // Se evita obtener las pistas eliminados
      ...(!checkDeleted && { is_delete: false }),

      // Se obtienen solo las pistas del complejo actual
      ...{ complex_id: complexId },

      ...(dto.id !== undefined && { id: dto.id }),

      // Se establecen las condiciones para los campos de tipo 'string'
      ...(dto.sport !== undefined && {
        sport: { contains: dto.sport, mode: 'insensitive' },
      }),
      ...(dto.name !== undefined && {
        name: { contains: dto.name, mode: 'insensitive' },
      }),

      ...(dto.maxPeople !== undefined && { max_people: dto.maxPeople }),
    };

    // Se realiza la consulta seleccionando las columnas que se quieren devolver
    const courts = await this.prisma.courts.findMany({
      where,
      select: {
        id: true,
        complex_id: true,
        sport: true,
        name: true,
        description: true,
        max_people: true,
        created_at: true,
        updated_at: true,
      },
    });

    // Se obtienen los estados de todas las pistas encontradas
    const courtsWithStatusAsync = courts.map(async (court) => {
      const status = await this.getCourtStatus(complexId, court.id);
      return {
        ...court,
        status: status.status,
      };
    });

    // Se resuelve la operación asíncrona
    const courtsWithStatus = await Promise.all(courtsWithStatusAsync);

    // Se devuelve la lista modificando los elementos obtenidos
    return courtsWithStatus.map((court) => new ResponseCourtDto(court));
  }

  async createCourt(
    complexId: number,
    dto: CreateCourtDto,
  ): Promise<ResponseCourtDto> {
    try {
      // Se crea la entrada para la pista en la BD
      const court = await this.prisma.courts.create({
        data: {
          complex_id: complexId,
          sport: dto.sport,
          name: dto.name,
          description: dto.description,
          max_people: dto.maxPeople,
        },
        select: {
          id: true,
          complex_id: true,
          sport: true,
          name: true,
          description: true,
          max_people: true,
          created_at: true,
          updated_at: true,
        },
      });

      // Se establece el estatus de la pista con el dado o uno por defecto
      const status = await this.setCourtStatus(complexId, court.id, {
        status: dto.status ?? Status.OPEN,
      });

      return new ResponseCourtDto({ ...court, status: status.status });
    } catch (error) {
      this.errorsService.dbError(error, {
        p2025: 'Court already exists.',
      });

      throw error;
    }
  }

  async getCourt(
    complexId: number,
    courtId: number,
  ): Promise<ResponseCourtDto> {
    // Se trata de obtener la pista con el 'id' dado
    const result = await this.getCourts(complexId, { id: courtId });

    // Se verifican los elementos obtenidos
    if (result.length === 0) {
      throw new NotFoundException(`Court with ID ${courtId} not found.`);
    } else if (result.length > 1) {
      throw new InternalServerErrorException(
        `Multiple courts found with ID ${courtId}.`,
      );
    }

    return result[0];
  }

  async updateCourt(
    complexId: number,
    courtId: number,
    dto: UpdateCourtDto,
  ): Promise<ResponseCourtDto> {
    // Se verifica que el cuerpo contiene elementos
    this.errorsService.noBodyError(dto);

    // Se establecen las propiedades a actualizar
    const data: Prisma.courtsUpdateInput = {
      ...(dto.sport !== undefined && { sport: dto.sport }),
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.maxPeople !== undefined && { max_people: dto.maxPeople }),
    };

    try {
      // Se actualiza la entrada de la pista
      const court = await this.prisma.courts.update({
        where: {
          id: courtId,
          is_delete: false,
        },
        data,
      });

      // Se obtiene el estatus actual de la pista
      const currentStatus = await this.getCourtStatus(complexId, courtId);
      let status;

      // Si está definido, se actualiza el estatus
      if (dto.status !== undefined && dto.status !== currentStatus.status) {
        status = await this.setCourtStatus(complexId, court.id, {
          status: dto.status,
        });
      }

      return new ResponseCourtDto({ ...court, status: status?.status ?? currentStatus.status });
    } catch (error) {
      this.errorsService.dbError(error, {
        p2025: `Court with ID ${courtId} not found.`,
      });

      throw error;
    }
  }

  async deleteCourt(_complexId: number, courtId: number): Promise<null> {
    try {
      // Se marca la pista como eliminada
      await this.prisma.courts.update({
        where: { id: courtId },
        data: { is_delete: true },
      });

      return null;
    } catch (error) {
      this.errorsService.dbError(error, {
        p2025: `Court with ID ${courtId} not found.`,
      });

      throw error;
    }
  }

  async getCourtStatus(
    complexId: number,
    courtId: number,
  ): Promise<ResponseCourtStatusDto> {
    // Se trata de obtener el estatus más actualizado de la pista dada
    const status = await this.prisma.courts_status.findFirst({
      where: {
        court_id: courtId,
      },
      orderBy: {
        created_at: 'desc',
      },
      select: {
        court_id: true,
        status: true,
        created_at: true,
      },
    });

    // Se devuelve el objeto obtenido o se construye uno con el estatus por defecto 'OPEN'
    return new ResponseCourtStatusDto({
      ...(status ?? {
        court_id: courtId,
        status: Status.OPEN,
      }),
      complex_id: complexId,
    });
  }

  async setCourtStatus(
    complexId: number,
    courtId: number,
    dto: CreateCourtStatusDto,
  ): Promise<ResponseCourtStatusDto> {
    try {
      // Se añade una nueva entrada con el estatus de la pista
      const status = await this.prisma.courts_status.create({
        data: {
          court_id: courtId,
          status: dto.status,
        },
        select: {
          court_id: true,
          status: true,
          created_at: true,
        },
      });

      return new ResponseCourtStatusDto({ ...status, complex_id: complexId });
    } catch (error) {
      this.errorsService.dbError(error, {
        p2025: `Court with ID ${courtId} not found.`,
      });

      throw error;
    }
  }

  async getCourtAvailability(
    complexId: number,
    courtId: number,
  ): Promise<ResponseCourtAvailabilityDto> {
    return new ResponseCourtAvailabilityDto();
  }

  async setCourtAvailability(
    complexId: number,
    courtId: number,
    dto: CreateCourtAvailabilityDto,
  ): Promise<ResponseCourtAvailabilityDto> {
    return new ResponseCourtAvailabilityDto();
  }
}
