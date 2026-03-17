import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { UtilitiesService } from 'src/common/utilities.service';
import { CourtsStatusService } from 'src/courts-status/courts-status.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '../../prisma/generated/client';
import { ResponseReservationDto } from '../common/dto';
import { ErrorsService } from '../common/errors.service';
import { CourtStatus } from '../courts/enums';
import {
  CreateReservationDto,
  GetReservationsDto,
  GetUserReservationsDto,
  RESERVATION_ORDER_FIELD_MAP,
  UpdateReservationDto,
} from './dto';
import { ReservationAvailabilityStatus, ReservationStatus, ReservationTimeFilter } from './enums';

@Injectable()
export class ReservationsService {
  constructor(
    private prisma: PrismaService,
    private errorsService: ErrorsService,
    private utilitiesService: UtilitiesService,
    private courtsStatusService: CourtsStatusService,
  ) {}

  /**
   * Validates if the given court ID is valid and currently open in the specified complex.
   *
   * @param {number} complexId - The ID of the complex to check.
   * @param {number} courtId - The ID of the court to validate.
   * @param dateIni - The initial date of the reservation.
   * @return {Promise<boolean>} A promise that resolves to `true` if the court ID is valid and open; otherwise, `false`.
   */
  public async validateCourt(complexId: number, courtId: number, dateIni: Date): Promise<boolean> {
    // Obtener las pistas del complejo
    const courts = await this.prisma.courts.findMany({ where: { complex_id: complexId } });

    // Obtener los índices y los estatus de las pistas por separado
    const courtIds = courts.map((court) => court.id);
    const courtStatuses = await Promise.all(
      courts.map(async (court) => {
        const courtStatus = await this.courtsStatusService.getCourtStatus(complexId, court.id);
        return courtStatus.statusData;
      }),
    );

    // Obtener la posición del 'id' de la pista en el array (si no se encuentra devolver -1)
    const index = courtIds.indexOf(courtId);
    return (
      index !== -1 &&
      (courtStatuses[index].status === CourtStatus.OPEN ||
        (courtStatuses[index].status === CourtStatus.WEATHER &&
          this.utilitiesService.dateIsEqualOrGreater(courtStatuses[index].estimatedDryingTime, dateIni, new Date())))
    );
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
    if (dto.courtId && dto.dateIni && !(await this.validateCourt(complexId, dto.courtId, dto.dateIni))) {
      throw new BadRequestException('Requested court is not valid.');
    }

    // Obtener el complejo
    const complex = await this.prisma.complexes.findUnique({ where: { id: complexId } });
    // Verificar los datos obtenidos
    if (!complex) {
      throw new NotFoundException(`Complex with ID ${complexId} not found.`);
    }

    // Obtener el horario del complejo
    const complexTime = { timeIni: complex.time_ini, timeEnd: complex.time_end };

    if (
      dto.dateIni &&
      dto.dateEnd &&
      !this.isValidDate(complexTime.timeIni, complexTime.timeEnd, dto.dateIni, dto.dateEnd)
    ) {
      throw new BadRequestException('Dates are not valid. Initial date must be previous to final date.');
    }
  }

  /**
   * Validates whether a given time range is valid based on input constraints.
   *
   * @param {string} complexTimeIni - The complex opening time.
   * @param {string} complexTimeEnd - The complex closing time.
   * @param {Date} dateIni - The starting date and time to validate.
   * @param {Date} dateEnd - The ending date and time to validate.
   * @return {boolean} Returns true if the date range and time constraints are valid, otherwise false.
   */
  private isValidDate(complexTimeIni: Date, complexTimeEnd: Date, dateIni: Date, dateEnd: Date): boolean {
    const afterComplexTimeIni = this.utilitiesService.timeIsEqualOrGreater(dateIni, complexTimeIni);
    const beforeComplexTimeEnd = this.utilitiesService.timeIsEqualOrLower(dateEnd, complexTimeEnd);

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
    // Construir el objeto 'where' para establecer las condiciones de la consulta
    const where: Prisma.reservationsWhereInput = {
      // Evitar obtener las reservas eliminadas
      ...(!checkDeleted && { is_delete: false }),

      ...(dto.id && { id: dto.id }),
      ...(dto.userId && { user_id: dto.userId }),
      ...(dto.complexId && { complex_id: dto.complexId }),
      ...(dto.courtId && { court_id: dto.courtId }),

      ...(dto.dateIni && { date_ini: dto.dateIni }),
      ...(dto.dateEnd && { date_end: dto.dateEnd }),

      ...(dto.status && { status: dto.status }),
    };

    // Obtener el filtro por momento de la reserva
    if (dto.timeFilter) {
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

    // Obtener el modo de ordenación de los elementos
    let orderBy: Prisma.reservationsOrderByWithRelationInput[] = [];
    if (dto.orderParams) {
      dto.orderParams.forEach((orderParam) => {
        const field = RESERVATION_ORDER_FIELD_MAP[orderParam.field];
        orderBy.push({
          [field]: orderParam.order,
        });
      });
    }

    // Realizar la consulta seleccionando las columnas que se quieren devolver
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
    if (dto.reservationStatus != null) {
      switch (dto.reservationStatus) {
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
        const timeFilter = this.utilitiesService.getTimeFilterFromDate(reservation.date_end);

        const statusData = (await this.courtsStatusService.getCourtStatus(reservation.complex_id, reservation.court_id))
          .statusData;

        return new ResponseReservationDto({
          ...reservation,
          reservationStatus: this.utilitiesService.getReservationStatus(
            reservation.status as ReservationAvailabilityStatus,
            statusData.status,
            timeFilter,
          ),
          timeFilter,
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
    // Tratar de obtener la reserva con el 'id' dado
    const result = await this.getReservations({ id: reservationId });

    // Verificar los elementos obtenidos
    if (result.length === 0) {
      throw new NotFoundException(`Reservation with ID ${reservationId} not found.`);
    } else if (result.length > 1) {
      throw new InternalServerErrorException(`Multiple reservations found with ID ${reservationId}.`);
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
    // Tratar de obtener las reservas
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
    // Tratar de obtener las reservas
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
  async createReservation(complexId: number, dto: CreateReservationDto): Promise<ResponseReservationDto> {
    // Verificar que los datos de la petición son correctos
    await this.validateReservationData(complexId, dto);

    try {
      // Crear la entrada para la pista en la BD
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
        reservationStatus: ReservationStatus.SCHEDULED,
        timeFilter: this.utilitiesService.getTimeFilterFromDate(reservation.date_end),
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
  async updateReservation(reservationId: number, dto: UpdateReservationDto): Promise<ResponseReservationDto> {
    // Verificar que el cuerpo contiene elementos
    this.errorsService.noBodyError(dto);

    // Obtener el complejo actual de la reserva
    const complexId = (await this.getReservation(reservationId)).complexId;

    // Verificar que los datos de la petición son correctos
    await this.validateReservationData(complexId, dto);

    // Establecer las propiedades a actualizar
    const data: Prisma.reservationsUpdateInput = {
      ...(dto.userId && { user_id: dto.userId }),
      ...(dto.courtId && { court_id: dto.courtId }),
      ...(dto.dateIni && { date_ini: dto.dateIni }),
      ...(dto.dateEnd && { date_end: dto.dateEnd }),
    };

    try {
      // Actualizar la entrada de la reserva
      const reservation = await this.prisma.reservations.update({
        where: {
          id: reservationId,
          is_delete: false,
        },
        data: { ...data, updated_at: new Date() },
      });

      const timeFilter = this.utilitiesService.getTimeFilterFromDate(reservation.date_end);

      const statusData = (await this.courtsStatusService.getCourtStatus(reservation.complex_id, reservation.court_id))
        .statusData;

      return new ResponseReservationDto({
        ...reservation,
        reservationStatus: this.utilitiesService.getReservationStatus(
          reservation.status as ReservationAvailabilityStatus,
          statusData.status,
          timeFilter,
        ),
        timeFilter,
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
      // Marcar la reserva como eliminada
      await this.prisma.reservations.update({
        where: { id: reservationId },
        data: { is_delete: true, updated_at: new Date() },
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
