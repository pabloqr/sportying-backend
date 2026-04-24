import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma } from '../../prisma/generated/client.js';
import { AuthService } from '../auth/auth.service.js';
import {
  DeviceTelemetrySlotDto,
  ResponseDeviceDto,
  ResponseDeviceStatusDto,
  ResponseDeviceTelemetryDto,
} from '../common/dto/index.js';
import { ErrorsService } from '../common/errors.service.js';
import {
  CreateDeviceDto,
  CreateDeviceStatusDto,
  CreateDeviceTelemetryDto,
  DEVICE_ORDER_FIELD_MAP,
  DEVICE_TELEMETRY_ORDER_FIELD_MAP,
  GetDevicesDto,
  GetDeviceTelemetryDto,
  UpdateDeviceDto,
} from './dto/index.js';

@Injectable({})
export class DevicesService {
  constructor(
    private prisma: PrismaService,
    private errorsService: ErrorsService,
    private authService: AuthService,
  ) {}

  /**
   * Processes the telemetry data for a given device, updating the system state based on the provided information.
   *
   * @param {number} complexId - The ID of the complex to which the device belongs.
   * @param {number} deviceId - The ID of the device for which telemetry is being processed.
   * @param {number} value - The telemetry value to process and analyze.
   * @param {Date} timestamp - The timestamp associated with the telemetry data.
   * @param {Function} getCourt - Function to get court details by complexId and courtId.
   * @return {Promise<void>} A promise that resolves once the telemetry data is processed.
   */
  // private async processDeviceTelemetry(
  //   complexId: number,
  //   deviceId: number,
  //   value: number,
  //   timestamp: Date,
  // ): Promise<void> {
  //   // Obtener la información sobre el dispositivo actual
  //   const device = await this.getDevice(complexId, deviceId);
  //   // Obtener las pistas que tiene asignadas en dispositivo
  //   const courtIds = (await this.courtsDevicesService.getDeviceCourts(complexId, deviceId, {})).courts;

  //   // Procesar la telemetría para actualizar el estado del sistema
  //   if (!courtIds.length) return;
  //   switch (device.type) {
  //     case DeviceType.PRESENCE:
  //       // Procesar los datos
  //       return await this.analysisService.processAvailabilityTelemetry(!value, timestamp, courtIds[0].id);
  //     case DeviceType.RAIN:
  //       // Obtener la telemetría anterior del dispositivo
  //       const deviceTelemetry = await this.getDeviceTelemetry(complexId, deviceId, {
  //         orderParams: [
  //           {
  //             field: DeviceTelemetryOrderField.CREATED_AT,
  //             order: OrderBy.ASC,
  //           },
  //         ],
  //       });

  //       // Tratar de obtener la telemetría previa, o establecer una por defecto
  //       const previousTelemetry = deviceTelemetry.telemetry.length >= 2 ? deviceTelemetry.telemetry[1] : null;

  //       // Procesar los datos
  //       return await this.analysisService.processRainTelemetry(
  //         complexId,
  //         previousTelemetry,
  //         value,
  //         courtIds.map((court) => court.id),
  //       );
  //   }
  // }

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
    // Construir el objeto 'where' para establecer las condiciones de la consulta
    const where: Prisma.devicesWhereInput = {
      // Evitar obtener las pistas eliminados
      ...(!checkDeleted && { is_delete: false }),

      // Obtener solo los dispositivos del complejo actual
      ...{ complex_id: complexId },

      ...(dto.id && { id: dto.id }),

      ...(dto.type && { type: dto.type }),
    };

    // Obtener el modo de ordenación de los elementos
    const orderBy: Prisma.devicesOrderByWithRelationInput[] = [];
    if (dto.orderParams) {
      dto.orderParams.forEach((orderParam) => {
        const field = DEVICE_ORDER_FIELD_MAP[orderParam.field];
        orderBy.push({
          [field]: orderParam.order,
        });
      });
    }

    // Realizar la consulta seleccionando las columnas que se quieren devolver
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

    // Devolver la lista modificando los elementos obtenidos
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
  async getDevice(complexId: number, deviceId: number): Promise<ResponseDeviceDto> {
    // Tratar de obtener el dispositivo con el 'id' dado
    const result = await this.getDevices(complexId, { id: deviceId });

    // Verificar los elementos obtenidos
    if (result.length > 1) {
      throw new InternalServerErrorException(`Multiple devices found with ID ${deviceId}.`);
    }

    // Obtener el usuario
    const device = result[0];

    // Verificar que es un objeto válido
    if (!device) {
      throw new NotFoundException(`Device with ID ${deviceId} not found.`);
    }

    return device;
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
  async createDevice(complexId: number, dto: CreateDeviceDto): Promise<ResponseDeviceDto> {
    // Crear la API Key para el dispositivo
    const apiKey = await this.authService.generateApiKey();

    try {
      // Crear la entrada para el dispositivo en la BD
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
  async updateDevice(complexId: number, deviceId: number, dto: UpdateDeviceDto): Promise<ResponseDeviceDto> {
    // Verificar que el cuerpo contiene elementos
    this.errorsService.noBodyError(dto);

    // Establecer las propiedades a actualizar
    const data: Prisma.devicesUpdateInput = {
      ...(dto.type && { type: dto.type }),
      ...(dto.status && { status: dto.status }),
    };

    try {
      // Actualizar la entrada del dispositivo
      const device = await this.prisma.devices.update({
        where: {
          id: deviceId,
          complex_id: complexId,
          is_delete: false,
        },
        data: { ...data, updated_at: new Date() },
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
        data: { is_delete: true, updated_at: new Date() },
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
    // Construir el objeto 'where' para establecer las condiciones de la consulta
    const where: Prisma.devices_telemetryWhereInput = {
      // Obtener solo las entradas del dispositivo dado
      ...{ device_id: deviceId },

      // Establecer condiciones para los límites de los valores
      ...(dto.minValue && {
        value: {
          gt: dto.minValue,
        },
      }),
      ...(dto.maxValue && {
        value: {
          lt: dto.maxValue,
        },
      }),
    };

    // Obtener el modo de ordenación de los elementos
    // En caso de no estar incluido, ordenar descendentemente por la fecha de creación
    const orderBy: Prisma.devices_telemetryOrderByWithRelationInput[] = [];
    if (dto.orderParams) {
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

    const device = await this.getDevice(complexId, deviceId);

    // Obtener la telemetría del dispositivo dado con las condiciones especificadas
    const telemetry = await this.prisma.devices_telemetry.findMany({
      where,
      orderBy,
      ...(dto.last && dto.last && { take: 1 }),
    });

    // Devolver el objeto obtenido
    return new ResponseDeviceTelemetryDto({
      deviceId,
      complexId,
      telemetry: telemetry.map((t) => new DeviceTelemetrySlotDto({ ...t, type: device.type })),
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
      // Añadir una nueva entrada con la telemetría del dispositivo
      const telemetry = await this.prisma.devices_telemetry.create({
        data: {
          device_id: deviceId,
          value: dto.value,
        },
      });

      // this.processDeviceTelemetry(complexId, deviceId, dto.value, telemetry.created_at).catch((error) =>
      //   console.error('Error processing device telemetry:', error),
      // );

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
  async getDeviceStatus(complexId: number, deviceId: number): Promise<ResponseDeviceStatusDto> {
    // Obtener todos los datos del dispositivo
    const device = await this.getDevice(complexId, deviceId);
    // Devolver los datos apropiados
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
      // Añadir una nueva entrada con la telemetría del dispositivo
      const device = await this.prisma.devices.update({
        where: {
          id: deviceId,
        },
        data: {
          status: dto.status,
          updated_at: new Date(),
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
}


