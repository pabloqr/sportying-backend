import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateDeviceCourtsDto,
  CreateDeviceDto,
  CreateDeviceStatusDto,
  CreateDeviceTelemetryDto,
  DEVICE_COURTS_ORDER_FIELD_MAP,
  DEVICE_ORDER_FIELD_MAP,
  DEVICE_TELEMETRY_ORDER_FIELD_MAP,
  GetDeviceCourtsDto,
  GetDevicesDto,
  GetDeviceTelemetryDto,
  UpdateDeviceDto,
} from './dto';
import {
  DeviceTelemetrySlotDto,
  ResponseDeviceCourtsDto,
  ResponseDeviceDto,
  ResponseDeviceStatusDto,
  ResponseDeviceTelemetryDto,
} from '../common/dto';
import { ErrorsService } from '../common/errors.service';
import { Prisma } from '@prisma/client';
import { AuthService } from '../auth/auth.service';
import { AnalysisService } from '../common/analysis.service';

@Injectable({})
export class DevicesService {
  constructor(
    private prisma: PrismaService,
    private errorsService: ErrorsService,
    private analysisService: AnalysisService,
    private authService: AuthService,
  ) {}

  /**
   * Processes the telemetry data for a given device, updating the system state based on the provided information.
   *
   * @param {number} complexId - The ID of the complex to which the device belongs.
   * @param {number} deviceId - The ID of the device for which telemetry is being processed.
   * @param {number} value - The telemetry value to process and analyze.
   * @return {Promise<void>} A promise that resolves once the telemetry data is processed.
   */
  private async processDeviceTelemetry(
    complexId: number,
    deviceId: number,
    value: number,
  ): Promise<void> {
    // Se obtiene la información sobre el dispositivo actual
    const device = await this.getDevice(complexId, deviceId);
    // Se obtienen las pistas que tiene asignadas en dispositivo
    const courts = (await this.getDeviceCourts(complexId, deviceId, {})).courts;
    // Se procesa la telemetría para actualizar el estado del sistema
    await this.analysisService.processDeviceTelemetry(
      device.id,
      device.type,
      value,
      courts,
    );
  }

  /**
   * Retrieves a list of devices based on the provided parameters.
   *
   * @param {number} complexId - The ID of the complex for which devices are to be retrieved.
   * @param {GetDevicesDto} dto - The data transfer object containing filters and order parameters for the query.
   * @param {boolean} [checkDeleted=false] - Determines if deleted devices should be included in the results.
   * @return {Promise<Array<ResponseDeviceDto>>} A promise that resolves to an array of ResponseDeviceDto objects
   * representing the devices that match the query criteria.
   */
  async getDevices(
    complexId: number,
    dto: GetDevicesDto,
    checkDeleted: boolean = false,
  ): Promise<Array<ResponseDeviceDto>> {
    // Se construye el objeto 'where' para establecer las condiciones de la consulta
    const where: Prisma.devicesWhereInput = {
      // Se evita obtener las pistas eliminados
      ...(!checkDeleted && { is_delete: false }),

      // Se obtienen solo los dispositivos del complejo actual
      ...{ complex_id: complexId },

      ...(dto.id !== undefined && { id: dto.id }),

      ...(dto.type !== undefined && { type: dto.type }),
    };

    // Se obtiene el modo de ordenación de los elementos
    let orderBy: Prisma.devicesOrderByWithRelationInput[] = [];
    if (dto.orderParams !== undefined) {
      dto.orderParams.forEach((orderParam) => {
        const field = DEVICE_ORDER_FIELD_MAP[orderParam.field];
        orderBy.push({
          [field]: orderParam.order,
        });
      });
    }

    // Se realiza la consulta seleccionando las columnas que se quieren devolver
    const devices = await this.prisma.devices.findMany({
      where,
      select: {
        id: true,
        complex_id: true,
        type: true,
        status: true,
        created_at: true,
        updated_at: true,
      },
      orderBy,
    });

    // Se devuelve la lista modificando los elementos obtenidos
    return devices.map((device) => new ResponseDeviceDto(device));
  }

  /**
   * Retrieves a specific device for a given complex using its ID.
   *
   * @param {number} complexId - The ID of the complex to which the device belongs.
   * @param {number} deviceId - The unique identifier of the device to retrieve.
   * @return {Promise<ResponseDeviceDto>} A promise resolving to the details of the requested device.
   * @throws {NotFoundException} If no device with the specified ID is found.
   * @throws {InternalServerErrorException} If multiple devices are found with the same ID.
   */
  async getDevice(
    complexId: number,
    deviceId: number,
  ): Promise<ResponseDeviceDto> {
    // Se trata de obtener el dispositivo con el 'id' dado
    const result = await this.getDevices(complexId, { id: deviceId });

    // Se verifican los elementos obtenidos
    if (result.length === 0) {
      throw new NotFoundException(`Device with ID ${deviceId} not found.`);
    } else if (result.length > 1) {
      throw new InternalServerErrorException(
        `Multiple devices found with ID ${deviceId}.`,
      );
    }

    return result[0];
  }

  /**
   * Creates a new device associated with a specific complex and returns the created device information.
   *
   * @param {number} complexId - The identifier of the complex to which the device belongs.
   * @param {CreateDeviceDto} dto - Data transfer object containing the details of the device to be created, including
   * type and status.
   *
   * @return {Promise<ResponseDeviceDto>} A promise that resolves to the newly created device details.
   */
  async createDevice(
    complexId: number,
    dto: CreateDeviceDto,
  ): Promise<ResponseDeviceDto> {
    // Se crea la API Key para el dispositivo
    const apiKey = await this.authService.generateApiKey();

    try {
      // Se crea la entrada para el dispositivo en la BD
      const device = await this.prisma.devices.create({
        data: {
          id_key: apiKey.idKey,
          api_key: apiKey.secretKey,
          complex_id: complexId,
          type: dto.type,
          status: dto.status,
        },
        select: {
          id: true,
          complex_id: true,
          type: true,
          status: true,
          created_at: true,
          updated_at: true,
        },
      });

      return new ResponseDeviceDto(device);
    } catch (error) {
      this.errorsService.dbError(error, {
        p2025: 'Device already exists.',
      });

      throw error;
    }
  }

  /**
   * Updates the details of a device associated with a specific complex.
   *
   * @param {number} complexId - The unique identifier of the complex where the device resides.
   * @param {number} deviceId - The unique identifier of the device to be updated.
   * @param {UpdateDeviceDto} dto - The data transfer object containing the fields to update on the device.
   * @return {Promise<ResponseDeviceDto>} A promise that resolves with the updated device information encapsulated in a
   * ResponseDeviceDto object.
   */
  async updateDevice(
    complexId: number,
    deviceId: number,
    dto: UpdateDeviceDto,
  ): Promise<ResponseDeviceDto> {
    // Se verifica que el cuerpo contiene elementos
    this.errorsService.noBodyError(dto);

    // Se establecen las propiedades a actualizar
    const data: Prisma.devicesUpdateInput = {
      ...(dto.type !== undefined && { type: dto.type }),
      ...(dto.status !== undefined && { status: dto.status }),
    };

    try {
      // Se actualiza la entrada del dispositivo
      const device = await this.prisma.devices.update({
        where: {
          id: deviceId,
          complex_id: complexId,
          is_delete: false,
        },
        data,
        select: {
          id: true,
          complex_id: true,
          type: true,
          status: true,
          created_at: true,
          updated_at: true,
        },
      });

      return new ResponseDeviceDto(device);
    } catch (error) {
      this.errorsService.dbError(error, {
        p2025: `Device with ID ${deviceId} not found.`,
      });

      throw error;
    }
  }

  /**
   * Marks a device as deleted by updating its `is_delete` field to true in the database.
   *
   * @param {number} complexId - The ID of the complex to which the device belongs.
   * @param {number} deviceId - The ID of the device to be deleted.
   * @return {Promise<null>} A promise that resolves to null if the operation is successful.
   * @throws Will throw an error if the device is not found or if a database error occurs.
   */
  async deleteDevice(complexId: number, deviceId: number): Promise<null> {
    try {
      await this.prisma.devices.update({
        where: { id: deviceId, complex_id: complexId },
        data: { is_delete: true },
      });

      return null;
    } catch (error) {
      this.errorsService.dbError(error, {
        p2025: `Device with ID ${deviceId} not found.`,
      });

      throw error;
    }
  }

  /**
   * Retrieves the telemetry data for a given device based on specified conditions and parameters.
   *
   * @param {number} complexId - The identifier of the complex where the device is located.
   * @param {number} deviceId - The unique identifier of the device for which telemetry data is to be retrieved.
   * @param {GetDeviceTelemetryDto} dto - An object containing parameters to filter or order the telemetry data, such as
   * value limits or ordering preferences.
   * @return {Promise<ResponseDeviceTelemetryDto>} A promise that resolves to an object containing the telemetry data of
   * the specified device.
   */
  async getDeviceTelemetry(
    complexId: number,
    deviceId: number,
    dto: GetDeviceTelemetryDto,
  ): Promise<ResponseDeviceTelemetryDto> {
    // Se construye el objeto 'where' para establecer las condiciones de la consulta
    const where: Prisma.devices_telemetryWhereInput = {
      // Se obtienen solo las entradas del dispositivo dado
      ...{ device_id: deviceId },

      // Se establecen condiciones para los límites de los valores
      ...(dto.minValue !== undefined && {
        value: {
          gt: dto.minValue,
        },
      }),
      ...(dto.maxValue !== undefined && {
        value: {
          lt: dto.maxValue,
        },
      }),
    };

    // Se obtiene el modo de ordenación de los elementos
    // En caso de no estar incluido, se ordena descendentemente por la fecha de creación
    let orderBy: Prisma.devices_telemetryOrderByWithRelationInput[] = [];
    if (dto.orderParams !== undefined) {
      dto.orderParams.forEach((orderParam) => {
        const field = DEVICE_TELEMETRY_ORDER_FIELD_MAP[orderParam.field];
        orderBy.push({
          [field]: orderParam.order,
        });
      });
    } else {
      orderBy.push({
        created_at: 'desc',
      });
    }

    // Se obtiene la telemetría del dispositivo dado con las condiciones especificadas
    const telemetry = await this.prisma.devices_telemetry.findMany({
      where,
      orderBy,
      ...(dto.last !== undefined && dto.last && { take: 1 }),
    });

    // Se devuelve el objeto obtenido
    return new ResponseDeviceTelemetryDto({
      deviceId,
      complexId,
      telemetry: telemetry.map((t) => new DeviceTelemetrySlotDto(t)),
    });
  }

  /**
   * Sets the telemetry information for a specific device.
   *
   * @param {number} complexId - The unique identifier of the complex the device belongs to.
   * @param {number} deviceId - The unique identifier of the device.
   * @param {CreateDeviceTelemetryDto} dto - The data transfer object containing telemetry values.
   * @return {Promise<ResponseDeviceTelemetryDto>} A promise that resolves to an object containing the updated device
   * telemetry information.
   */
  async setDeviceTelemetry(
    complexId: number,
    deviceId: number,
    dto: CreateDeviceTelemetryDto,
  ): Promise<ResponseDeviceTelemetryDto> {
    try {
      // Se añade una nueva entrada con la telemetría del dispositivo
      const telemetry = await this.prisma.devices_telemetry.create({
        data: {
          device_id: deviceId,
          value: dto.value,
        },
      });

      this.processDeviceTelemetry(complexId, deviceId, dto.value).catch(
        (error) => console.error('Error processing device telemetry:', error),
      );

      return new ResponseDeviceTelemetryDto({
        deviceId,
        complexId,
        telemetry: [new DeviceTelemetrySlotDto(telemetry)],
      });
    } catch (error) {
      this.errorsService.dbError(error, {
        p2025: `Device with ID ${deviceId} not found.`,
      });

      throw error;
    }
  }

  /**
   * Retrieves the status of a specific device within a given complex.
   *
   * @param {number} complexId - The unique identifier of the complex where the device is located.
   * @param {number} deviceId - The unique identifier of the device whose status is being requested.
   * @return {Promise<ResponseDeviceStatusDto>} A promise that resolves with the complete status of the device.
   */
  async getDeviceStatus(
    complexId: number,
    deviceId: number,
  ): Promise<ResponseDeviceStatusDto> {
    // Se obtienen todos los datos del dispositivo
    const device = await this.getDevice(complexId, deviceId);
    console.log({
      ...device,
      created_at: device.updatedAt,
    });
    // Se devuelven los datos apropiados
    return new ResponseDeviceStatusDto({
      ...device,
      created_at: device.updatedAt,
    });
  }

  /**
   * Updates the status of a specific device within a complex.
   *
   * @param {number} complexId - The ID of the complex to which the device belongs.
   * @param {number} deviceId - The ID of the device whose status is being updated.
   * @param {CreateDeviceStatusDto} dto - The data transfer object containing the new device status.
   * @return {Promise<ResponseDeviceStatusDto>} A promise that resolves with the updated status and metadata of the
   * device.
   */
  async setDeviceStatus(
    complexId: number,
    deviceId: number,
    dto: CreateDeviceStatusDto,
  ): Promise<ResponseDeviceStatusDto> {
    try {
      // Se añade una nueva entrada con la telemetría del dispositivo
      const device = await this.prisma.devices.update({
        where: {
          id: deviceId,
        },
        data: {
          status: dto.status,
        },
        select: {
          status: true,
          updated_at: true,
        },
      });

      return new ResponseDeviceStatusDto({
        deviceId,
        complexId,
        status: device.status,
        createdAt: device.updated_at,
      });
    } catch (error) {
      this.errorsService.dbError(error, {
        p2025: `Device with ID ${deviceId} not found.`,
      });

      throw error;
    }
  }

  /**
   * Retrieves a list of courts associated with a specific device in a complex.
   *
   * @param {number} complexId - The unique identifier of the complex.
   * @param {number} deviceId - The unique identifier of the device.
   * @param {GetDeviceCourtsDto} dto - The data transfer object containing filters and order parameters for the courts.
   * @param {boolean} [checkDeleted=false] - A flag to include deleted courts in the result. If false, deleted courts
   * are excluded.
   * @return {Promise<ResponseDeviceCourtsDto>} A promise that resolves with a response object containing the device ID,
   * complex ID, and associated courts.
   */
  async getDeviceCourts(
    complexId: number,
    deviceId: number,
    dto: GetDeviceCourtsDto,
    checkDeleted: boolean = false,
  ): Promise<ResponseDeviceCourtsDto> {
    // Se construye el objeto 'where' para establecer las condiciones de la consulta
    const where: Prisma.courts_devicesWhereInput = {
      // Se evita obtener las pistas eliminados
      ...(!checkDeleted && { is_delete: false }),

      // Se obtienen solo las relaciones del dispositivo actual
      ...{ device_id: deviceId },

      ...(dto.courtId !== undefined && { court_id: dto.courtId }),
    };

    // Se obtiene el modo de ordenación de los elementos
    let orderBy: Prisma.courts_devicesOrderByWithRelationInput[] = [];
    if (dto.orderParams !== undefined) {
      dto.orderParams.forEach((orderParam) => {
        const field = DEVICE_COURTS_ORDER_FIELD_MAP[orderParam.field];
        orderBy.push({
          [field]: orderParam.order,
        });
      });
    }

    // Se obtienen todas las entradas en las que se relacione una pista con el dispositivo dado
    const deviceCourts = await this.prisma.courts_devices.findMany({
      where,
      orderBy,
    });

    return new ResponseDeviceCourtsDto({
      deviceId,
      complexId,
      courts: deviceCourts.map((dc) => dc.court_id),
    });
  }

  /**
   * Associates a list of courts with a specific device. This method updates the existing associations by adding new
   * courts,
   * retaining current ones, and marking removed associations as deleted.
   *
   * @param {number} complexId - The identifier for the sports or device complex.
   * @param {number} deviceId - The identifier for the specific device to associate with the courts.
   * @param {CreateDeviceCourtsDto} dto - An object containing the list of court IDs to be associated with the specified
   * device.
   * @return {Promise<ResponseDeviceCourtsDto>} A promise that resolves to an object containing the updated device-court
   * associations.
   */
  async setDeviceCourts(
    complexId: number,
    deviceId: number,
    dto: CreateDeviceCourtsDto,
  ): Promise<ResponseDeviceCourtsDto> {
    // Se obtienen las pistas actuales asociadas con el dispositivo
    let currentDeviceCourts = (
      await this.getDeviceCourts(complexId, deviceId, {}, true)
    ).courts;

    try {
      let deviceCourts: number[] = [];

      // Se procesan todas las pistas
      for (const courtId of dto.courts) {
        if (!currentDeviceCourts.includes(courtId)) {
          // Si la pista actual no está incluida en la lista, se crea una nueva entrada
          const dc = await this.prisma.courts_devices.create({
            data: {
              court_id: courtId,
              device_id: deviceId,
            },
          });

          // Se añade a la lista final
          deviceCourts.push(dc.court_id);
        } else {
          // Si la pista actual está incluida en la lista, se actualiza la entrada para asegurar que no se ha
          // establecido como eliminada
          const dc = await this.prisma.courts_devices.update({
            where: {
              court_id_device_id: {
                court_id: courtId,
                device_id: deviceId,
              },
            },
            data: {
              is_delete: false,
            },
          });

          // Se añade a la lista final
          deviceCourts.push(dc.court_id);

          // Se elimina el valor de la lista inicial
          currentDeviceCourts = currentDeviceCourts.filter(
            (court) => court !== courtId,
          );
        }

        // Se actualizan las entradas restantes para establecerlas como eliminadas
        for (const courtId of currentDeviceCourts) {
          await this.prisma.courts_devices.update({
            where: {
              court_id_device_id: {
                court_id: courtId,
                device_id: deviceId,
              },
            },
            data: {
              is_delete: true,
            },
          });
        }
      }

      return new ResponseDeviceCourtsDto({
        deviceId,
        complexId,
        courts: deviceCourts,
      });
    } catch (error) {
      this.errorsService.dbError(error);

      throw error;
    }
  }
}
