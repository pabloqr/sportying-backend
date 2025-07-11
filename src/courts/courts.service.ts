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
import { CourtStatus } from './enums';

@Injectable()
export class CourtsService {
  constructor(
    private prisma: PrismaService,
    private errorsService: ErrorsService,
  ) {}

  public async isValidCourt(
    complexId: number,
    courtId: number,
  ): Promise<boolean> {
    // Se obtienen las pistas del complejo
    const courts = await this.getCourts(complexId, {});

    // Se obtienen los índices y los estatus de las pistas por separado
    const courtIds = courts.map((court) => court.id);
    const courtStatuses = courts.map((court) => court.status);

    // Se obtiene la posición del 'id' de la pista en el array (si no se encuentra devuelve -1)
    const index = courtIds.indexOf(courtId);
    return index !== -1 && courtStatuses[index] === CourtStatus.OPEN;
  }

  //------------------------------------------------------------------------------------------------------------------//

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

    // Se filtran las entradas del array si está definido el estatus en el dto
    let courtsWithStatusFiltered = courtsWithStatus;
    if (dto.status !== undefined) {
      courtsWithStatusFiltered = courtsWithStatus.filter(
        (court) => court.status === dto.status,
      );
    }

    // Se devuelve la lista modificando los elementos obtenidos
    return courtsWithStatusFiltered.map((court) => new ResponseCourtDto(court));
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
        status: dto.status ?? CourtStatus.OPEN,
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

      // Si está definido, se actualiza el estatus
      let status;
      if (dto.status !== undefined && dto.status !== currentStatus.status) {
        status = await this.setCourtStatus(complexId, court.id, {
          status: dto.status,
        });
      }

      return new ResponseCourtDto({
        ...court,
        status: status?.status ?? currentStatus.status,
      });
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
        status: CourtStatus.OPEN,
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
    const availability = await this.prisma.reservations.findMany({
      where: {
        court_id: courtId,
      },
      select: {
        court_id: true,
        date_ini: true,
        date_end: true,
      },
    });

    const formattedAvailability = availability.map((reservation) => ({
      date_ini: reservation.date_ini,
      date_end: reservation.date_end,
      availability: false,
    }));

    return new ResponseCourtAvailabilityDto({
      court_id: courtId,
      complex_id: complexId,
      availability: formattedAvailability,
    });
  }

  async setCourtAvailability(
    complexId: number,
    courtId: number,
    dto: CreateCourtAvailabilityDto,
  ): Promise<ResponseCourtAvailabilityDto> {
    // TODO: crear reserva

    return this.getCourtAvailability(complexId, courtId);
  }
}
