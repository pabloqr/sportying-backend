import {
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import * as ngeohash from 'ngeohash';
import { PrismaService } from 'src/prisma/prisma.service';
import { WeatherDataDto } from 'src/weather/dto';
import { WeatherService } from 'src/weather/weather.service';
import { Prisma } from '../../prisma/generated/client';
import {
  ResponseComplexDto,
  ResponseComplexTimeDto,
  ResponseCourtAvailabilityDto,
} from '../common/dto';
import { ErrorsService } from '../common/errors.service';
import { CourtsService } from '../courts/courts.service';
import {
  COMPLEX_ORDER_FIELD_MAP,
  CreateComplexDto,
  GetComplexesDto,
  UpdateComplexDto,
  UpdateComplexTimeDto,
} from './dto';

@Injectable()
export class ComplexesService {
  constructor(
    private prisma: PrismaService,
    private errorsService: ErrorsService,
    @Inject(forwardRef(() => WeatherService))
    private weatherService: WeatherService,
    @Inject(forwardRef(() => CourtsService))
    private courtsService: CourtsService,
  ) { }

  /**
   * Retrieves a list of complexes based on the provided filters and conditions.
   * It supports filtering by various fields, ordering by specific properties,
   * and optionally includes deleted records.
   *
   * @param {GetComplexesDto} dto - The data transfer object containing the filter and order parameters for querying
   * complexes.
   * @param {boolean} [checkDeleted=false] - A flag indicating whether to include deleted complexes in the result set.
   * Defaults to false.
   * @return {Promise<Array<ResponseComplexDto>>} - A promise that resolves to an array of ResponseComplexDto instances
   * representing the matching complexes.
   */
  async getComplexes(
    dto: GetComplexesDto,
    checkDeleted: boolean = false,
  ): Promise<Array<ResponseComplexDto>> {
    // Construir el objeto 'where' para establecer las condiciones de la consulta
    const where: Prisma.complexesWhereInput = {
      // Evitar obtener los complejos eliminados
      ...(!checkDeleted && { is_delete: false }),

      ...(dto.id !== undefined && { id: dto.id }),

      // Establecer las condiciones para los campos de tipo 'string'
      ...(dto.complexName !== undefined && {
        complex_name: { contains: dto.complexName, mode: 'insensitive' },
      }),

      // Establecer las condiciones para los campos de tipo 'Date'
      ...(dto.timeIni !== undefined && { time_ini: dto.timeIni }),
      ...(dto.timeEnd !== undefined && { time_end: dto.timeEnd }),

      ...(dto.locLongitude !== undefined && {
        loc_longitude: dto.locLongitude,
      }),
      ...(dto.locLatitude !== undefined && { loc_latitude: dto.locLatitude }),
    };

    // Obtener el modo de ordenación de los elementos
    let orderBy: Prisma.complexesOrderByWithRelationInput[] = [];
    if (dto.orderParams !== undefined) {
      dto.orderParams.forEach((orderParam) => {
        const field = COMPLEX_ORDER_FIELD_MAP[orderParam.field];
        orderBy.push({
          [field]: orderParam.order,
        });
      });
    }

    // Realizar la consulta seleccionando las columnas que se quieren devolver
    const complexes = await this.prisma.complexes.findMany({
      where,
      select: {
        id: true,
        complex_name: true,
        time_ini: true,
        time_end: true,
        loc_longitude: true,
        loc_latitude: true,
        created_at: true,
        updated_at: true,
      },
      orderBy,
    });

    const weatherData: Map<string, WeatherDataDto> = new Map<string, WeatherDataDto>();

    // Devolver la lista modificando los elementos obtenidos
    return Promise.all(complexes.map(async (complex) => {
      // Obtener las pistas asociadas al complejo actual
      const courts = await this.courtsService.getCourts(complex.id, {});
      // Filtrar los deportes
      const sports = [...new Set(courts.map((court) => court.sport))];

      // Obtener el geohash de las coordenadas dadas
      const geohash = ngeohash.encode(complex.loc_latitude, complex.loc_longitude, 5);
      // Obtener la meteorología si no existe previamente
      if (!weatherData.has(geohash)) weatherData[geohash] = await this.weatherService.getWeather(geohash);

      return new ResponseComplexDto({ ...complex, sports, weather: weatherData[geohash] });
    }));
  }

  /**
   * Retrieves a complex entity by its unique identifier.
   *
   * @param {number} complexId - The unique identifier of the complex to retrieve.
   * @return {Promise<ResponseComplexDto>} A promise that resolves to the retrieved complex entity.
   * @throws {NotFoundException} If no complex is found with the specified ID.
   * @throws {InternalServerErrorException} If multiple complexes are found with the specified ID.
   */
  async getComplex(complexId: number): Promise<ResponseComplexDto> {
    // Se trata de obtener el complejo con el 'id' dado
    const result = await this.getComplexes({ id: complexId });

    // Se verifican los elementos obtenidos
    if (result.length === 0) {
      throw new NotFoundException(`Complex with ID ${complexId} not found.`);
    } else if (result.length > 1) {
      throw new InternalServerErrorException(
        `Multiple complexes found with ID ${complexId}.`,
      );
    }

    return result[0];
  }

  /**
   * Creates a new complex entry in the database.
   *
   * @param {CreateComplexDto} dto - Data Transfer Object containing the details of the complex to be created.
   * It includes the complex name, schedule times, and location coordinates.
   * @return {Promise<ResponseComplexDto>} A promise that resolves to a ResponseComplexDto containing the details of
   * the newly created complex.
   */
  async createComplex(dto: CreateComplexDto): Promise<ResponseComplexDto> {
    try {
      // Se crea la entrada para el complejo en la BD
      const complex = await this.prisma.complexes.create({
        data: {
          complex_name: dto.complexName,
          time_ini: dto.timeIni,
          time_end: dto.timeEnd,
          loc_longitude: dto.locLongitude,
          loc_latitude: dto.locLatitude,
        },
        select: {
          id: true,
          complex_name: true,
          time_ini: true,
          time_end: true,
          loc_longitude: true,
          loc_latitude: true,
          created_at: true,
          updated_at: true,
        },
      });

      return new ResponseComplexDto(complex);
    } catch (error) {
      this.errorsService.dbError(error, {
        p2025: 'Complex already exists.',
      });

      throw error;
    }
  }

  /**
   * Updates an existing complex with the specified ID using the data provided in the DTO.
   *
   * @param {number} complexId - The unique identifier of the complex to update.
   * @param {UpdateComplexDto} dto - The data transfer object containing the properties to update for the complex.
   * @return {Promise<ResponseComplexDto>} A promise that resolves to a ResponseComplexDto containing the updated
   * complex details.
   */
  async updateComplex(
    complexId: number,
    dto: UpdateComplexDto,
  ): Promise<ResponseComplexDto> {
    // Se verifica que el cuerpo contiene elementos
    this.errorsService.noBodyError(dto);

    // Se establecen las propiedades a actualizar
    const data = {
      ...(dto.complexName !== undefined && { complex_name: dto.complexName }),
      ...(dto.timeIni !== undefined && { time_ini: dto.timeIni }),
      ...(dto.timeEnd !== undefined && { time_end: dto.timeEnd }),
      ...(dto.locLongitude !== undefined && {
        loc_longitude: dto.locLongitude,
      }),
      ...(dto.locLatitude !== undefined && { loc_latitude: dto.locLatitude }),
    };

    try {
      // Se actualiza la entrada del complejo
      const complex = await this.prisma.complexes.update({
        where: {
          id: complexId,
          is_delete: false,
        },
        data,
      });

      return new ResponseComplexDto(complex);
    } catch (error) {
      this.errorsService.dbError(error, {
        p2025: `Complex with ID ${complexId} not found.`,
      });

      throw error;
    }
  }

  /**
   * Marks a complex as deleted by updating its is_delete property to true in the database.
   *
   * @param {number} complexId - The ID of the complex to be marked as deleted.
   * @return {Promise<null>} A promise that resolves to null if the operation is successful.
   * @throws Will rethrow any database error that occurs during the operation.
   */
  async deleteComplex(complexId: number): Promise<null> {
    try {
      await this.prisma.complexes.update({
        where: { id: complexId },
        data: { is_delete: true },
      });

      return null;
    } catch (error) {
      this.errorsService.dbError(error, {
        p2025: `Complex with ID ${complexId} not found.`,
      });

      throw error;
    }
  }

  /**
   * Retrieves the operating hours of a complex identified by its ID.
   *
   * @param {number} complexId - The unique identifier of the complex.
   * @return {Promise<ResponseComplexTimeDto>} A promise that resolves to an object containing the opening and closing
   * times of the complex.
   */
  async getComplexTime(complexId: number): Promise<ResponseComplexTimeDto> {
    // Se obtiene la información del complejo y se devuelven los campos con el horario
    const complex = await this.getComplex(complexId);
    return { timeIni: complex.timeIni, timeEnd: complex.timeEnd };
  }

  /**
   * Updates the time information of a complex and returns the updated time fields.
   *
   * @param {number} complexId - The unique identifier of the complex to update.
   * @param {UpdateComplexTimeDto} dto - The data transfer object containing the updated time information.
   * @return {Promise<ResponseComplexTimeDto>} A promise that resolves to an object containing the updated time fields.
   */
  async setComplexTime(
    complexId: number,
    dto: UpdateComplexTimeDto,
  ): Promise<ResponseComplexTimeDto> {
    // Se actualiza la información del complejo y se devuelven los campos con el horario
    const complex = await this.updateComplex(complexId, dto);
    return { timeIni: complex.timeIni, timeEnd: complex.timeEnd };
  }

  /**
   * Retrieves the availability of courts within a specified complex.
   *
   * @param {number} complexId - The unique identifier for the complex.
   * @param {boolean} [groupAvailability=true] - Determines if the availability should be grouped.
   * @return {Promise<Array<ResponseCourtAvailabilityDto>>} A promise resolving to an array of court availability data.
   */
  async getComplexAvailability(
    complexId: number,
    groupAvailability: boolean = true,
  ): Promise<Array<ResponseCourtAvailabilityDto>> {
    return this.courtsService.getCourtsAvailability(
      complexId,
      groupAvailability,
    );
  }
}
