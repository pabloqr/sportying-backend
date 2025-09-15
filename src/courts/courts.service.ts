import {
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ErrorsService } from '../common/errors.service';
import {
  COURT_ORDER_FIELD_MAP,
  CreateCourtDto,
  CreateCourtStatusDto,
  GetCourtDevicesDto,
  GetCourtsDto,
  UpdateCourtDto,
} from './dto';
import { Prisma } from '@prisma/client';
import {
  CourtAvailabilitySlotDto,
  ResponseCourtAvailabilityDto,
  ResponseCourtDevicesDto,
  ResponseCourtDto,
  ResponseCourtStatusDto,
} from '../common/dto';
import { CourtStatus } from './enums';
import { ReservationsService } from '../reservations/reservations.service';
import { ReservationOrderField } from '../reservations/dto';
import { UtilitiesService } from '../common/utilities.service';
import { ReservationAvailabilityStatus } from '../reservations/enums';
import { CourtsDevicesService } from '../courts-devices/courts-devices.service';

@Injectable()
export class CourtsService {
  constructor(
    private prisma: PrismaService,
    private errorsService: ErrorsService,
    private utilitiesService: UtilitiesService,
    private courtsDevicesService: CourtsDevicesService,
    @Inject(forwardRef(() => ReservationsService))
    private reservationsService: ReservationsService,
  ) {}

  /**
   * Validates if the given court ID is valid and currently open in the specified complex.
   *
   * @param {number} complexId - The ID of the complex to check.
   * @param {number} courtId - The ID of the court to validate.
   * @return {Promise<boolean>} A promise that resolves to `true` if the court ID is valid and open; otherwise, `false`.
   */
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

  /**
   * Retrieves a list of courts based on the specified criteria.
   *
   * @param {number} complexId - The ID of the complex to filter courts.
   * @param {GetCourtsDto} dto - An object containing filtering and sorting parameters.
   * @param {boolean} [checkDeleted=false] - Whether to include deleted courts in the results.
   * @return {Promise<Array<ResponseCourtDto>>} A promise that resolves to an array of ResponseCourtDto objects
   * representing the filtered and processed courts.
   */
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

    // Se obtiene el modo de ordenación de los elementos
    let orderBy: Prisma.courtsOrderByWithRelationInput[] = [];
    if (dto.orderParams !== undefined) {
      dto.orderParams.forEach((orderParam) => {
        const field = COURT_ORDER_FIELD_MAP[orderParam.field];
        orderBy.push({
          [field]: orderParam.order,
        });
      });
    }

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
      orderBy,
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

    // Se filtran las entradas del array si está definido el estatus
    let courtsWithStatusFiltered = courtsWithStatus;
    if (dto.status !== undefined) {
      courtsWithStatusFiltered = courtsWithStatus.filter(
        (court) => court.status === dto.status,
      );
    }

    // Se devuelve la lista modificando los elementos obtenidos
    return courtsWithStatusFiltered.map((court) => new ResponseCourtDto(court));
  }

  /**
   * Retrieves a court by its ID within a given complex.
   *
   * @param {number} complexId - The ID of the complex where the court is located.
   * @param {number} courtId - The ID of the court to be retrieved.
   * @return {Promise<ResponseCourtDto>} A promise that resolves to the details of the requested court.
   * @throws {NotFoundException} If no court with the specified ID is found.
   * @throws {InternalServerErrorException} If multiple courts with the specified ID are found.
   */
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

  /**
   * Creates a new court associated with the given complex ID and details provided in the data transfer object (DTO).
   *
   * @param {number} complexId - The ID of the complex to which the court belongs.
   * @param {CreateCourtDto} dto - The data transfer object containing court details such as sport, name, description,
   * maximum capacity, and status.
   * @return {Promise<ResponseCourtDto>} A promise that resolves to a ResponseCourtDto containing the details of the
   * created court, including its status.
   */
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

  /**
   * Updates the details of a court based on the provided information.
   *
   * @param {number} complexId - The ID of the sports complex to which the court belongs.
   * @param {number} courtId - The unique ID of the court that needs to be updated.
   * @param {UpdateCourtDto} dto - The data transfer object containing the properties to be updated for the court.
   * @return {Promise<ResponseCourtDto>} Returns a promise that resolves to a ResponseCourtDto object containing the
   * updated court information, including its current status.
   */
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

  /**
   * Marks a court as deleted by updating its status in the database.
   *
   * @param {number} _complexId - The ID of the complex to which the court belongs. Currently unused in the function
   * logic.
   * @param {number} courtId - The ID of the court to be marked as deleted.
   * @return {Promise<null>} A promise that resolves with null once the court is successfully marked as deleted.
   * @throws Will throw an error if there's a database error or if the court is not found.
   */
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

  /**
   * Retrieves the most recent status of a specific court.
   *
   * @param {number} complexId - The identifier for the sports complex to which the court belongs.
   * @param {number} courtId - The identifier for the court whose status is to be retrieved.
   * @return {Promise<ResponseCourtStatusDto>} A promise that resolves to the most updated status of the court, or a
   * default status if no recent status is found.
   */
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

  /**
   * Updates the status of a court by creating a new entry in the court status table.
   *
   * @param {number} complexId - The ID of the complex to which the court belongs.
   * @param {number} courtId - The ID of the court whose status is being updated.
   * @param {CreateCourtStatusDto} dto - The data transfer object containing the new status information for the court.
   * @return {Promise<ResponseCourtStatusDto>} A promise that resolves to the updated court status object.
   */
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
      });

      return new ResponseCourtStatusDto({ ...status, complex_id: complexId });
    } catch (error) {
      this.errorsService.dbError(error, {
        p2025: `Court with ID ${courtId} not found.`,
      });

      throw error;
    }
  }

  /**
   * Retrieves the court availability for a given complex ID. It optionally groups the availability by contiguous time
   * intervals.
   *
   * @param {number} complexId - The identifier of the complex for which the court availability is to be retrieved.
   * @param {boolean} [groupAvailability=true] - A flag indicating whether the availability should be grouped by
   * contiguous time slots or not.
   * @return {Promise<Array<ResponseCourtAvailabilityDto>>} A promise that resolves to an array of court availability
   * data transfer objects.
   */
  async getCourtsAvailability(
    complexId: number,
    groupAvailability: boolean = true,
  ): Promise<Array<ResponseCourtAvailabilityDto>> {
    // Se obtienen las reservas para el complejo actual, ordenadas por su 'id' y la fecha de inicio
    const reservations = await this.reservationsService.getReservations({
      complexId,
      orderParams: [
        { field: ReservationOrderField.ID },
        { field: ReservationOrderField.DATE_INI },
      ],
    });

    // Se filtran las reservas para no procesar las canceladas
    const filteredReservations = reservations.filter(
      (reservation) =>
        reservation.status !==
        ReservationAvailabilityStatus.CANCELLED,
    );

    // Se agrupan las reservas en función del 'id' de la pista
    const groupedReservations = this.utilitiesService.groupArrayByField(
      filteredReservations,
      'courtId',
    );

    // Se crea el array de disponibilidad con los datos de las reservas
    return Array.from(groupedReservations.entries()).map(([key, value]) => {
      // Se formatean las reservas para que tengan la estructura correcta
      const formattedReservations = value.map(
        (reservation) =>
          new CourtAvailabilitySlotDto({
            ...reservation,
            available: false,
          }),
      );

      // Si no se quiere agrupar la disponibilidad, se devuelve
      if (!groupAvailability) {
        return new ResponseCourtAvailabilityDto({
          court_id: key,
          complex_id: complexId,
          availability: formattedReservations,
        });
      }

      // Disponibilidad por intervalos
      const groupedAvailability: CourtAvailabilitySlotDto[] = [];
      if (formattedReservations.length > 0) {
        // Intervalo actual
        let currentAvailability: CourtAvailabilitySlotDto | undefined =
          undefined;

        formattedReservations.forEach((reservation) => {
          // Si el intervalo actual es indefinido, se actualiza y se devuelve
          if (currentAvailability === undefined) {
            currentAvailability = new CourtAvailabilitySlotDto(reservation);
            return;
          }

          // Se establecen las condiciones para verificar si los intervalos son contiguos
          const equalEdgeDates =
            currentAvailability.dateEnd.getTime() ===
            reservation.dateIni.getTime();
          const equalAvailability =
            currentAvailability.available === reservation.available;

          if (equalEdgeDates && equalAvailability) {
            // Si son contiguos, se extiende el intervalo
            currentAvailability.dateEnd = reservation.dateEnd;
          } else {
            // Si no son contiguos, se añade el intervalo actual al array y se actualiza
            groupedAvailability.push(currentAvailability);
            currentAvailability = new CourtAvailabilitySlotDto(reservation);
          }
        });

        // Se añade el intervalo final al array
        if (currentAvailability !== undefined) {
          groupedAvailability.push(currentAvailability);
        }
      }

      return new ResponseCourtAvailabilityDto({
        court_id: key,
        complex_id: complexId,
        availability: groupedAvailability,
      });
    });
  }

  /**
   * Retrieves the availability information for a specific court within a complex.
   *
   * @param {number} complexId - The unique identifier of the complex.
   * @param {number} courtId - The unique identifier of the court.
   * @param {boolean} [groupAvailability=true] - Specifies whether to group availability by complexes.
   * @return {Promise<ResponseCourtAvailabilityDto>} A Promise that resolves to the availability details of the
   * specified court.
   */
  async getCourtAvailability(
    complexId: number,
    courtId: number,
    groupAvailability: boolean = true,
  ): Promise<ResponseCourtAvailabilityDto> {
    const availability = await this.getCourtsAvailability(
      complexId,
      groupAvailability,
    );
    return (
      availability.find(
        (courtAvailability) => courtAvailability.id === courtId,
      ) ?? new ResponseCourtAvailabilityDto({ courtId, complexId })
    );
  }

  /**
   * Fetches court devices based on the provided parameters and conditions.
   * This method delegates to the CourtsDevicesService to handle the relationship logic.
   *
   * @param {number} complexId - The ID of the sports complex where the court resides.
   * @param {number} courtId - The ID of the court whose devices are being retrieved.
   * @param {GetCourtDevicesDto} dto - Data transfer object containing filtering and ordering parameters.
   * @param {Function} getDevice - Function to get device details by complexId and deviceId.
   * @param {boolean} [checkDeleted=false] - If true, includes devices marked as deleted; otherwise, excludes them.
   * @return {Promise<ResponseCourtDevicesDto>} A promise that resolves to a ResponseCourtDevicesDto containing the
   * court devices data.
   */
  async getCourtDevices(
    complexId: number,
    courtId: number,
    dto: GetCourtDevicesDto,
    getDevice: (complexId: number, deviceId: number) => Promise<any>,
    checkDeleted: boolean = false,
  ): Promise<ResponseCourtDevicesDto> {
    return this.courtsDevicesService.getCourtDevices(
      complexId,
      courtId,
      dto,
      getDevice,
      checkDeleted,
    );
  }
}
