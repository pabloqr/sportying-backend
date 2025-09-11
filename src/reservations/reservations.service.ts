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
import {
  ReservationAvailabilityStatus,
  ReservationStatus,
  ReservationTimeFilter,
} from './enums';
import { ComplexesService } from '../complexes/complexes.service';
import { CourtStatus } from '../courts/enums';

@Injectable()
export class ReservationsService {
  constructor(
    private prisma: PrismaService,
    private errorsService: ErrorsService,
    @Inject(forwardRef(() => ComplexesService))
    private complexesService: ComplexesService,
    @Inject(forwardRef(() => CourtsService))
    private courtsService: CourtsService,
  ) {}

  /**
   * Determines the reservation time filter based on the provided date.
   *
   * @param {Date} date - The date to evaluate for determining the time filter.
   * @return {ReservationTimeFilter} Returns PAST if the date is earlier than the current date,
   *  otherwise returns UPCOMING.
   */
  private getTimeFilterFromDate(date: Date): ReservationTimeFilter {
    return date < new Date()
      ? ReservationTimeFilter.PAST
      : ReservationTimeFilter.UPCOMING;
  }

  /**
   * Validates the reservation data provided in the DTO. Checks the validity of the court ID
   * and ensures the initial and final dates are valid.
   *
   * @param {number} complexId - The ID of the complex to validate the court against.
   * @param {CreateReservationDto | UpdateReservationDto} dto - The reservation data transfer object containing the
   * court ID and date information.
   * @return {Promise<void>} A promise that resolves when the validation is successful. Throws a BadRequestException if
   * validation fails.
   */
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

    // Se obtiene el horario del complejo
    const complexTime = await this.complexesService.getComplexTime(complexId);

    if (
      dto.dateIni !== undefined &&
      dto.dateEnd !== undefined &&
      !this.isValidDate(
        complexTime.timeIni,
        complexTime.timeEnd,
        dto.dateIni,
        dto.dateEnd,
      )
    ) {
      throw new BadRequestException(
        'Dates are not valid. Initial date must be previous to final date.',
      );
    }
  }

  /**
   * Validates whether a given time range is valid based on input constraints.
   *
   * @param {string} complexTimeIni - The initial time in HH:mm format as a string.
   * @param {string} complexTimeEnd - The end time in HH:mm format as a string.
   * @param {Date} dateIni - The starting date and time to validate.
   * @param {Date} dateEnd - The ending date and time to validate.
   * @return {boolean} Returns true if the date range and time constraints are valid, otherwise false.
   */
  private isValidDate(
    complexTimeIni: string,
    complexTimeEnd: string,
    dateIni: Date,
    dateEnd: Date,
  ): boolean {
    const complexTimeIniSplit = complexTimeIni.split(':').map(Number);
    const afterComplexTimeIni =
      complexTimeIniSplit[0] < dateIni.getHours() ||
      (complexTimeIniSplit[0] === dateIni.getHours() &&
        complexTimeIniSplit[1] <= dateIni.getMinutes());

    const complexTimeEndSplit = complexTimeEnd.split(':').map(Number);
    const beforeComplexTimeEnd =
      complexTimeEndSplit[0] > dateEnd.getHours() ||
      (complexTimeEndSplit[0] === dateEnd.getHours() &&
        complexTimeEndSplit[1] >= dateEnd.getMinutes());

    return dateIni < dateEnd && afterComplexTimeIni && beforeComplexTimeEnd;
  }

  //------------------------------------------------------------------------------------------------------------------//

  /**
   * Fetches a list of reservations based on the provided filter criteria.
   *
   * @param {GetReservationsDto} dto - The data transfer object containing the filter and sorting criteria for
   * reservations.
   * @param {boolean} [checkDeleted=false] - Determines whether to include deleted reservations in the results.
   * @return {Promise<Array<ResponseReservationDto>>} A promise that resolves to an array of reservation DTOs.
   */
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

      ...(dto.availabilityStatus !== undefined && {
        status: dto.availabilityStatus,
      }),
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

    let filteredReservations = reservations;
    if (dto.status != null) {
      switch (dto.status) {
        case ReservationStatus.SCHEDULED:
        case ReservationStatus.WEATHER:
        case ReservationStatus.COMPLETED:
          filteredReservations = reservations.filter(
            (reservation) => reservation.status !== ReservationStatus.CANCELLED,
          );
          break;
        case ReservationStatus.CANCELLED:
          filteredReservations = reservations.filter(
            (reservation) => reservation.status === ReservationStatus.CANCELLED,
          );
      }
    }

    return Promise.all(
      filteredReservations.map(async (reservation) => {
        const timeFilter = this.getTimeFilterFromDate(reservation.date_end);

        const courtStatus = (
          await this.courtsService.getCourtStatus(
            reservation.complex_id,
            reservation.court_id,
          )
        ).status;

        let status = ReservationStatus.SCHEDULED;
        if (timeFilter === ReservationTimeFilter.UPCOMING) {
          switch (courtStatus) {
            case CourtStatus.OPEN:
              break;
            case CourtStatus.WEATHER:
              status = ReservationStatus.WEATHER;
              break;
            case CourtStatus.BLOCKED:
            case CourtStatus.MAINTENANCE:
              status = ReservationStatus.CANCELLED;
              break;
          }
        } else if (timeFilter === ReservationTimeFilter.PAST) {
          switch (reservation.status) {
            case ReservationAvailabilityStatus.CANCELLED:
              status = ReservationStatus.CANCELLED;
              break;
            default:
              status = ReservationStatus.COMPLETED;
              break;
          }
        }

        return new ResponseReservationDto({
          ...reservation,
          status,
          time_filter: timeFilter,
        });
      }),
    );
  }

  /**
   * Retrieves a reservation by its unique identifier.
   *
   * @param {number} reservationId - The unique identifier of the reservation to retrieve.
   * @return {Promise<ResponseReservationDto>} A promise that resolves to the reservation details if found.
   * @throws {NotFoundException} If no reservation with the given ID is found.
   * @throws {InternalServerErrorException} If multiple reservations with the same ID are found.
   */
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

  /**
   * Fetches the reservations associated with a specific user.
   *
   * @param {number} userId The unique identifier of the user whose reservations are to be retrieved.
   * @param {GetUserReservationsDto} dto An object containing filtering and query parameters for fetching reservations.
   * @param {boolean} [checkDeleted=false] Indicates whether to include deleted reservations in the results.
   * @return {Promise<Array<ResponseReservationDto>>} A promise that resolves to an array of reservation details.
   */
  async getUserReservations(
    userId: number,
    dto: GetUserReservationsDto,
    checkDeleted: boolean = false,
  ): Promise<Array<ResponseReservationDto>> {
    // Se trata de obtener las reservas
    return this.getReservations({ ...dto, userId }, checkDeleted);
  }

  /**
   * Retrieves a list of reservations for a specific complex based on the provided parameters.
   *
   * @param {number} complexId - The unique identifier of the complex for which reservations are being retrieved.
   * @param {GetUserReservationsDto} dto - An object containing reservation filter criteria such as date range or user
   * information.
   * @param {boolean} [checkDeleted=false] - Optional flag to include or exclude soft-deleted reservations in the
   * result.
   * @return {Promise<Array<ResponseReservationDto>>} A promise that resolves to an array of reservation data objects.
   */
  async getComplexReservations(
    complexId: number,
    dto: GetUserReservationsDto,
    checkDeleted: boolean = false,
  ): Promise<Array<ResponseReservationDto>> {
    // Se trata de obtener las reservas
    return this.getReservations({ ...dto, complexId }, checkDeleted);
  }

  /**
   * Creates a new reservation for the specified sports complex and user details.
   * Validates the reservation data before proceeding and handles potential database errors.
   *
   * @param {number} complexId - The identifier of the sports complex where the reservation is being made.
   * @param {CreateReservationDto} dto - The data transfer object containing reservation details such as user, court,
   * and time range.
   * @return {Promise<ResponseReservationDto>} A promise resolving to the response DTO containing reservation details,
   * including time filter.
   */
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

  /**
   * Updates an existing reservation with the provided data.
   *
   * @param {number} reservationId - The ID of the reservation to be updated.
   * @param {UpdateReservationDto} dto - The data transfer object containing the updated reservation details.
   * @return {Promise<ResponseReservationDto>} A promise resolving to the updated reservation details encapsulated in a
   * response DTO.
   */
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

  /**
   * Marks a reservation as deleted by updating the reservation's status in the database.
   *
   * @param {number} reservationId - The unique identifier of the reservation to be deleted.
   * @return {Promise<null>} A promise that resolves to null upon successful deletion.
   * @throws Will throw an error if the reservation ID does not exist or if a database error occurs.
   */
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

  //------------------------------------------------------------------------------------------------------------------//

  /**
   * Updates the status of a reservation.
   *
   * @param {number} reservationId - The unique identifier of the reservation to update.
   * @param {ReservationAvailabilityStatus} status - The new status to be applied to the reservation.
   * @return {Promise<ResponseReservationDto>} A promise that resolves with the updated reservation details.
   */
  async setReservationStatus(
    reservationId: number,
    status: ReservationAvailabilityStatus,
  ): Promise<ResponseReservationDto> {
    try {
      const reservation = await this.prisma.reservations.update({
        where: {
          id: reservationId,
          is_delete: false,
        },
        data: {
          status,
        },
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
}
