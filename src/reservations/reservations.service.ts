import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ErrorsService } from '../common/errors.service';
import {
  CreateReservationDto,
  GetReservationsDto,
  GetUserReservationsDto,
  RESERVATION_ORDER_FIELD_MAP,
  UpdateReservationDto,
} from './dto';
import { ResponseReservationDto } from '../common/dto';
import { Prisma } from '@prisma/client';
import { CourtsService } from '../courts/courts.service';
import { ReservationTimeFilter } from './enums';

@Injectable()
export class ReservationsService {
  constructor(
    private prisma: PrismaService,
    private errorsService: ErrorsService,
    @Inject(forwardRef(() => CourtsService))
    private courtsService: CourtsService,
  ) {}

  private getTimeFilterFromDate(date: Date): ReservationTimeFilter {
    return date < new Date()
      ? ReservationTimeFilter.PAST
      : ReservationTimeFilter.UPCOMING;
  }

  private async validateReservationData(
    complexId: number,
    dto: CreateReservationDto | UpdateReservationDto,
  ): Promise<void> {
    if (
      dto.courtId !== undefined &&
      !(await this.courtsService.isValidCourt(complexId, dto.courtId))
    ) {
      throw new BadRequestException('Requested court is not valid.');
    }

    if (
      dto.dateIni !== undefined &&
      dto.dateEnd !== undefined &&
      !this.isValidDate(dto.dateIni, dto.dateEnd)
    ) {
      throw new BadRequestException(
        'Dates are not valid. Initial date must be previous to final date.',
      );
    }
  }

  private isValidDate(dateIni: Date, dateEnd: Date): boolean {
    return dateIni < dateEnd;
  }

  //------------------------------------------------------------------------------------------------------------------//

  async getReservations(
    dto: GetReservationsDto,
    checkDeleted: boolean = false,
  ): Promise<Array<ResponseReservationDto>> {
    // Se construye el objeto 'where' para establecer las condiciones de la consulta
    const where: Prisma.reservationsWhereInput = {
      // Se evita obtener las reservas eliminadas
      ...(!checkDeleted && { is_delete: false }),

      ...(dto.id !== undefined && { id: dto.id }),
      ...(dto.userId !== undefined && { user_id: dto.userId }),
      ...(dto.complexId !== undefined && { complex_id: dto.complexId }),
      ...(dto.courtId !== undefined && { court_id: dto.courtId }),

      ...(dto.dateIni !== undefined && { date_ini: dto.dateIni }),
      ...(dto.dateEnd !== undefined && { date_end: dto.dateEnd }),

      ...(dto.status !== undefined && { status: dto.status }),
    };

    // Se obtiene el filtro por momento de la reserva
    if (dto.timeFilter !== undefined) {
      switch (dto.timeFilter) {
        case ReservationTimeFilter.PAST:
          where.date_end = { lt: new Date() };
          break;
        case ReservationTimeFilter.UPCOMING:
          where.date_ini = { gt: new Date() };
          break;
        case ReservationTimeFilter.ALL:
        default:
          break;
      }
    }

    // Se obtiene el modo de ordenación de los elementos
    let orderBy: Prisma.reservationsOrderByWithRelationInput[] = [];
    if (dto.orderParams !== undefined) {
      dto.orderParams.forEach((orderParam) => {
        const field = RESERVATION_ORDER_FIELD_MAP[orderParam.field];
        orderBy.push({
          [field]: orderParam.order,
        });
      });
    }

    // Se realiza la consulta seleccionando las columnas que se quieren devolver
    const reservations = await this.prisma.reservations.findMany({
      where,
      select: {
        id: true,
        user_id: true,
        complex_id: true,
        court_id: true,
        date_ini: true,
        date_end: true,
        status: true,
        created_at: true,
        updated_at: true,
      },
      orderBy,
    });

    return reservations.map(
      (reservation) =>
        new ResponseReservationDto({
          ...reservation,
          time_filter: this.getTimeFilterFromDate(reservation.date_end),
        }),
    );
  }

  async getReservation(reservationId: number): Promise<ResponseReservationDto> {
    // Se trata de obtener la reserva con el 'id' dado
    const result = await this.getReservations({ id: reservationId });

    // Se verifican los elementos obtenidos
    if (result.length === 0) {
      throw new NotFoundException(
        `Reservation with ID ${reservationId} not found.`,
      );
    } else if (result.length > 1) {
      throw new InternalServerErrorException(
        `Multiple reservations found with ID ${reservationId}.`,
      );
    }

    return result[0];
  }

  async getUserReservations(
    userId: number,
    dto: GetUserReservationsDto,
    checkDeleted: boolean = false,
  ): Promise<Array<ResponseReservationDto>> {
    // Se trata de obtener las reservas
    return this.getReservations({ ...dto, userId }, checkDeleted);
  }

  async getComplexReservations(
    complexId: number,
    dto: GetUserReservationsDto,
    checkDeleted: boolean = false,
  ): Promise<Array<ResponseReservationDto>> {
    // Se trata de obtener las reservas
    return this.getReservations({ ...dto, complexId }, checkDeleted);
  }

  async createReservation(
    complexId: number,
    dto: CreateReservationDto,
  ): Promise<ResponseReservationDto> {
    // Se verifica que los datos de la petición son correctos
    await this.validateReservationData(complexId, dto);

    try {
      // Se crea la entrada para la pista en la BD
      const reservation = await this.prisma.reservations.create({
        data: {
          user_id: dto.userId,
          complex_id: complexId,
          court_id: dto.courtId,
          date_ini: dto.dateIni,
          date_end: dto.dateEnd,
        },
        select: {
          id: true,
          user_id: true,
          court_id: true,
          date_ini: true,
          date_end: true,
          status: true,
          created_at: true,
          updated_at: true,
        },
      });

      return new ResponseReservationDto({
        ...reservation,
        time_filter: this.getTimeFilterFromDate(reservation.date_end),
      });
    } catch (error) {
      this.errorsService.dbError(error, {
        p2025: 'Overlapping reservations.',
      });

      throw error;
    }
  }

  async updateReservation(
    reservationId: number,
    dto: UpdateReservationDto,
  ): Promise<ResponseReservationDto> {
    // Se verifica que el cuerpo contiene elementos
    this.errorsService.noBodyError(dto);

    // Se obtiene el complejo actual de la reserva
    const complexId = (await this.getReservation(reservationId)).complexId;

    // Se verifica que los datos de la petición son correctos
    await this.validateReservationData(complexId, dto);

    // Se establecen las propiedades a actualizar
    const data: Prisma.reservationsUpdateInput = {
      ...(dto.userId !== undefined && { user_id: dto.userId }),
      ...(dto.courtId !== undefined && { court_id: dto.courtId }),
      ...(dto.dateIni !== undefined && { date_ini: dto.dateIni }),
      ...(dto.dateEnd !== undefined && { date_end: dto.dateEnd }),
    };

    try {
      // Se actualiza la entrada de la reserva
      const reservation = await this.prisma.reservations.update({
        where: {
          id: reservationId,
          is_delete: false,
        },
        data,
      });

      return new ResponseReservationDto({
        ...reservation,
        time_filter: this.getTimeFilterFromDate(reservation.date_end),
      });
    } catch (error) {
      this.errorsService.dbError(error, {
        p2025: `Reservation with ID ${reservationId} not found.`,
      });

      throw error;
    }
  }

  async deleteReservation(reservationId: number): Promise<null> {
    try {
      // Se marca la reserva como eliminada
      await this.prisma.reservations.update({
        where: { id: reservationId },
        data: { is_delete: true },
      });

      return null;
    } catch (error) {
      this.errorsService.dbError(error, {
        p2025: `Reservation with ID ${reservationId} not found.`,
      });

      throw error;
    }
  }
}
