import { ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CourtsStatusService } from 'src/courts-status/courts-status.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from 'prisma/generated/client';
import { CourtAvailabilitySlotDto, ResponseCourtAvailabilityDto, ResponseCourtDto } from 'src/common/dto';
import { ErrorsService } from 'src/common/errors.service';
import { UtilitiesService } from 'src/common/utilities.service';
import { ReservationOrderField } from 'src/reservations/dto';
import { ReservationAvailabilityStatus, ReservationStatus } from 'src/reservations/enums';
import { ReservationsService } from 'src/reservations/reservations.service';
import { WeatherService } from 'src/weather/weather.service';
import { COURT_ORDER_FIELD_MAP, CreateCourtDto, CreateCourtStatusDto, GetCourtsDto, UpdateCourtDto } from './dto';
import { CourtStatus, INACTIVE_COURT_STATUS } from './enums';

@Injectable()
export class CourtsService {
  constructor(
    private prisma: PrismaService,
    private errorsService: ErrorsService,
    private utilitiesService: UtilitiesService,
    private weatherService: WeatherService,
    private courtsStatusService: CourtsStatusService,
    private reservationsService: ReservationsService,
  ) {}

  private async calculateCourtNumber(complexId: number, sportKey: string): Promise<number> {
    // Obtener el máximo para el complejo y deporte dados
    const aggregate = await this.prisma.courts.aggregate({
      _max: { number: true },
      where: { complex_id: complexId, sport_key: sportKey, is_delete: false },
    });

    // Calcular el número de pista a asignar
    return (aggregate._max.number || 0) + 1;
  }

  private async checkExistingCourtNumber(complexId: number, number: number, sportKey: string) {
    // Obtener una pista existente para el número dado y la combinación complejo-deporte
    const exists = await this.prisma.courts.findFirst({
      where: {
        complex_id: complexId,
        number,
        sport_key: sportKey,
        is_delete: false,
      },
    });

    // Si existe, lanzar un error de conflicto
    if (exists) {
      throw new ConflictException(
        `Court number ${number} alerady exists in complex with ID ${complexId} and SportKey ${sportKey}`,
      );
    }
  }

  private insertBlock(
    availability: CourtAvailabilitySlotDto[],
    candidate: { dateIni: Date; dateEnd: Date },
  ): CourtAvailabilitySlotDto[] {
    let { dateIni, dateEnd } = candidate;

    if (dateIni >= dateEnd) return availability;

    for (const slot of availability) {
      // Caso 1: candidate completamente dentro de un bloque
      if (dateIni >= slot.dateIni && dateEnd <= slot.dateEnd) {
        return availability;
      }

      // Caso 2: solapamiento por ambos lados
      if (dateIni < slot.dateIni && dateEnd > slot.dateEnd) {
        const updatedAvailability = this.insertBlock(availability, { dateIni, dateEnd: slot.dateIni });
        return this.insertBlock(updatedAvailability, { dateIni: slot.dateEnd, dateEnd });
      }

      // Caso 3a: solapamiento por la izquierda
      if (dateIni < slot.dateEnd && dateEnd > slot.dateEnd) {
        dateIni = new Date(slot.dateEnd);
      }

      // Caso 3b: solapamiento por la derecha
      if (dateEnd > slot.dateIni && dateIni < slot.dateIni) {
        dateEnd = new Date(slot.dateIni);
      }
    }

    return [
      ...availability,
      new CourtAvailabilitySlotDto({
        dateIni,
        dateEnd,
        available: false,
      }),
    ].sort((a, b) => a.dateIni.getTime() - b.dateIni.getTime());
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
    // Construir el objeto 'where' para establecer las condiciones de la consulta
    const where: Prisma.courtsWhereInput = {
      // Evitar obtener las pistas eliminados
      ...(!checkDeleted && { is_delete: false }),

      // Obtener solo las pistas del complejo actual
      ...{ complex_id: complexId },

      ...(dto.id && { id: dto.id }),

      // Establecer las condiciones para los campos de tipo 'string'
      ...(dto.sportKey && { sport_key: { contains: dto.sportKey, mode: 'insensitive' } }),

      ...(dto.number && { name: dto.number }),
      ...(dto.maxPeople && { max_people: dto.maxPeople }),
    };

    // Obtener el modo de ordenación de los elementos
    const orderBy: Prisma.courtsOrderByWithRelationInput[] = [];
    if (dto.orderParams) {
      dto.orderParams.forEach((orderParam) => {
        const field = COURT_ORDER_FIELD_MAP[orderParam.field];
        orderBy.push({
          [field]: orderParam.order,
        });
      });
    }

    // Realizar la consulta seleccionando las columnas que se quieren devolver
    const courts = await this.prisma.courts.findMany({
      where,
      select: {
        id: true,
        complex_id: true,
        sport_key: true,
        number: true,
        description: true,
        max_people: true,
        created_at: true,
        updated_at: true,
      },
      orderBy,
    });

    // Obtener los estados de todas las pistas encontradas
    const courtsWithStatusAsync = courts.map(async (court) => {
      const courtStatus = await this.courtsStatusService.getCourtStatus(complexId, court.id);
      return {
        ...court,
        status_data: courtStatus.statusData,
      };
    });

    // Resolver la operación asíncrona
    const courtsWithStatus = await Promise.all(courtsWithStatusAsync);

    // Filtrar las entradas del array si está definido el estado
    let courtsWithStatusFiltered = courtsWithStatus;
    if (dto.statusData) {
      courtsWithStatusFiltered = courtsWithStatus.filter((court) => {
        // Obtener los datos sobre el estado del DTO y del objeto
        const dtoStatusData = dto.statusData;
        const courtStatusData = court.status_data;

        // Verificar los datos para el estado, el nivel de alerta y el tiempo de secado
        const status = !dtoStatusData || !dtoStatusData.status || dtoStatusData.status === courtStatusData.status;
        const alertLevel =
          !dtoStatusData || !dtoStatusData.alertLevel || dtoStatusData.alertLevel == courtStatusData.alertLevel;
        const estimatedDryingTime =
          !dtoStatusData ||
          !dtoStatusData.estimatedDryingTime ||
          dtoStatusData.estimatedDryingTime == courtStatusData.estimatedDryingTime;

        return status && alertLevel && estimatedDryingTime;
      });
    }

    // Devolver la lista modificando los elementos obtenidos
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
  async getCourt(complexId: number, courtId: number, checkDeleted: boolean = false): Promise<ResponseCourtDto> {
    // Tratar de obtener la pista con el 'id' dado
    const result = await this.getCourts(complexId, { id: courtId }, checkDeleted);

    // Verificar los elementos obtenidos
    if (result.length === 0) {
      throw new NotFoundException(`Court with ID ${courtId} not found.`);
    } else if (result.length > 1) {
      throw new InternalServerErrorException(`Multiple courts found with ID ${courtId}.`);
    }

    return result[0];
  }

  /**
   * Creates a new court associated with the given complex ID and details provided in the data transfer object (DTO).
   *
   * @param {number} complexId - The ID of the complex to which the court belongs.
   * @param {CreateCourtDto} dto - The data transfer object containing court details such as sport key, name,
   * description, maximum capacity, and status.
   * @return {Promise<ResponseCourtDto>} A promise that resolves to a ResponseCourtDto containing the details of the
   * created court, including its status.
   */
  async createCourt(complexId: number, dto: CreateCourtDto): Promise<ResponseCourtDto> {
    try {
      // Obtener de la petición o calcular el número de pista para la combinación complejo-deporte
      const number = dto.number ?? (await this.calculateCourtNumber(complexId, dto.sportKey));

      // Verificar si hay una pista existente para el número dado y la combinación complejo-deporte
      await this.checkExistingCourtNumber(complexId, number, dto.sportKey);

      // Crear la entrada para la pista en la BD
      const court = await this.prisma.courts.create({
        data: {
          complex_id: complexId,
          sport_key: dto.sportKey,
          number,
          description: dto.description,
          max_people: dto.maxPeople,
        },
        select: {
          id: true,
          complex_id: true,
          sport_key: true,
          number: true,
          description: true,
          max_people: true,
          created_at: true,
          updated_at: true,
        },
      });

      let statusData: CreateCourtStatusDto;
      if (dto.statusData?.status && !INACTIVE_COURT_STATUS.has(dto.statusData.status)) {
        const weather = await this.weatherService.getWeatherFromId(complexId);

        // Obtener los datos del estado de la pista en función de la información meteorológica
        statusData = {
          status: weather.alert_level >= 2 ? CourtStatus.WEATHER : CourtStatus.OPEN,
          alertLevel: weather.alert_level,
          estimatedDryingTime: weather.estimated_drying_time,
        };
      } else {
        // Establecer los datos del estado de la pista con los dado o unos por defecto
        statusData = {
          status: dto.statusData?.status ?? CourtStatus.OPEN,
          alertLevel: 0,
          estimatedDryingTime: 0,
        };
      }

      // Establecer el estado de la pista
      const courtStatus = await this.courtsStatusService.setCourtStatus(complexId, court.id, statusData);

      return new ResponseCourtDto({ ...court, statusData: courtStatus.statusData });
    } catch (error) {
      this.errorsService.dbError(error, {
        p2003: `Cannot assign court to complex with ID ${complexId}. Complex not found.`,
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
  async updateCourt(complexId: number, courtId: number, dto: UpdateCourtDto): Promise<ResponseCourtDto> {
    // Verificar que el cuerpo contiene elementos
    this.errorsService.noBodyError(dto);

    // Establecer las propiedades a actualizar
    const data: Prisma.courtsUpdateInput = {
      ...(dto.number && { number: dto.number }),
      ...(dto.description && { description: dto.description }),
      ...(dto.maxPeople && { max_people: dto.maxPeople }),
      ...(dto.isDelete && { is_delete: dto.isDelete }),
    };

    try {
      // Obtener el deporte asignado a la pista
      const storedCourt = await this.getCourt(complexId, courtId, true);

      // Verificar si hay una pista existente para el número dado y la combinación complejo-deporte
      await this.checkExistingCourtNumber(complexId, dto.number ?? storedCourt.number, storedCourt.sportKey);

      // Actualizar la entrada de la pista
      const court = await this.prisma.courts.update({
        where: { id: courtId },
        data: { ...data, updated_at: new Date() },
      });

      // Actualizar el estado de la pista
      const courtStatus = await this.courtsStatusService.setCourtStatus(complexId, courtId, {
        status: dto.statusData?.status,
        alertLevel: dto.statusData?.alertLevel,
        estimatedDryingTime: dto.statusData?.estimatedDryingTime,
      });

      return new ResponseCourtDto({
        ...court,
        statusData: courtStatus.statusData,
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
      // Marcar la pista como eliminada
      await this.prisma.courts.update({
        where: { id: courtId },
        data: { is_delete: true, updated_at: new Date() },
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
    // Obtener las reservas para el complejo actual, ordenadas por su 'id' y la fecha de inicio
    const reservations = await this.reservationsService.getReservations({
      complexId,
      orderParams: [{ field: ReservationOrderField.ID }, { field: ReservationOrderField.DATE_INI }],
    });

    // Filtrar las reservas para no procesar las canceladas
    const filteredReservations = reservations.filter(
      (reservation) =>
        reservation.status !== ReservationAvailabilityStatus.CANCELLED &&
        reservation.reservationStatus !== ReservationStatus.COMPLETED &&
        reservation.reservationStatus !== ReservationStatus.CANCELLED &&
        reservation.dateIni > new Date(),
    );

    // Agrupar las reservas en función del 'id' de la pista
    const groupedReservations = this.utilitiesService.groupArrayByField(filteredReservations, 'courtId');

    // Formatear las reservas para que tengan la estructura correcta
    const formattedReservations = new Map<number, CourtAvailabilitySlotDto[]>();
    for (const [courtId, reservations] of groupedReservations.entries()) {
      const slots = reservations.map(
        (reservation) =>
          new CourtAvailabilitySlotDto({
            ...reservation,
            available: false,
          }),
      );
      formattedReservations.set(courtId as number, slots);
    }

    const courts = await this.getCourts(complexId, {});
    for (const court of courts) {
      const statusData = (await this.courtsStatusService.getCourtStatus(complexId, court.id)).statusData;
      if (statusData.status === CourtStatus.WEATHER) {
        const timeBlock = this.utilitiesService.getTimeBlock(statusData.estimatedDryingTime);

        // Obtener los slots existentes para esta pista
        const existingSlots = formattedReservations.get(court.id) ?? [];

        // Insertar el bloque de tiempo en los slots existentes
        const updatedSlots = this.insertBlock(existingSlots, timeBlock);

        // Actualizar el mapa con los slots actualizados
        formattedReservations.set(court.id, updatedSlots);
      }
    }

    // Crear el array de disponibilidad con los datos de las reservas
    return Promise.all(
      Array.from(formattedReservations.entries()).map(async ([key, value]) => {
        const reservations = value;

        // Si no se quiere agrupar la disponibilidad, devolver
        if (!groupAvailability) {
          return new ResponseCourtAvailabilityDto({
            court_id: key,
            complex_id: complexId,
            availability: reservations,
          });
        }

        // Disponibilidad por intervalos
        const groupedAvailability: CourtAvailabilitySlotDto[] = [];
        if (reservations.length > 0) {
          // Intervalo actual
          let currentAvailability: CourtAvailabilitySlotDto | undefined = undefined;

          reservations.forEach((reservation) => {
            // Si el intervalo actual es indefinido, actualizarlo y devolverlo
            if (!currentAvailability) {
              currentAvailability = new CourtAvailabilitySlotDto(reservation);
              return;
            }

            // Establecer las condiciones para verificar si los intervalos son contiguos
            const equalEdgeDates = currentAvailability.dateEnd.getTime() === reservation.dateIni.getTime();
            const equalAvailability = currentAvailability.available === reservation.available;

            if (equalEdgeDates && equalAvailability) {
              // Si son contiguos, extender el intervalo
              currentAvailability.dateEnd = reservation.dateEnd;
            } else {
              // Si no son contiguos, añadir el intervalo actual al array y actualizarlo
              groupedAvailability.push(currentAvailability);
              currentAvailability = new CourtAvailabilitySlotDto(reservation);
            }
          });

          // Añadir el intervalo final al array
          if (currentAvailability) {
            groupedAvailability.push(currentAvailability);
          }
        }

        return new ResponseCourtAvailabilityDto({
          court_id: key,
          complex_id: complexId,
          availability: groupedAvailability,
        });
      }),
    );
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
    const availability = await this.getCourtsAvailability(complexId, groupAvailability);
    return (
      availability.find((courtAvailability) => courtAvailability.id === courtId) ??
      new ResponseCourtAvailabilityDto({ courtId, complexId })
    );
  }
}
