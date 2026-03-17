import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '../../prisma/generated/client';
import { ResponseCourtDevicesDto, ResponseCourtDto, ResponseDeviceCourtsDto, ResponseDeviceDto } from '../common/dto';
import { ErrorsService } from '../common/errors.service';
import { COURT_DEVICES_ORDER_FIELD_MAP, GetCourtDevicesDto } from '../courts/dto';
import { CreateDeviceCourtsDto, DEVICE_COURTS_ORDER_FIELD_MAP, GetDeviceCourtsDto } from '../devices/dto';

@Injectable()
export class CourtsDevicesService {
  constructor(
    private prisma: PrismaService,
    private errorsService: ErrorsService,
  ) {}

  /**
   * Fetches court devices based on the provided parameters and conditions.
   *
   * @param {number} complexId - The ID of the sports complex where the court resides.
   * @param {number} courtId - The ID of the court whose devices are being retrieved.
   * @param {GetCourtDevicesDto} dto - Data transfer object containing filtering and ordering parameters.
   * @param {boolean} [checkDeleted=false] - If true, includes devices marked as deleted; otherwise, excludes them.
   * @param {Function} getDevice - Function to get device details by complexId and deviceId.
   * @return {Promise<ResponseCourtDevicesDto>} A promise that resolves to a ResponseCourtDevicesDto containing the
   * court devices data.
   */
  async getCourtDevices(
    complexId: number,
    courtId: number,
    dto: GetCourtDevicesDto,
    checkDeleted: boolean = false,
  ): Promise<ResponseCourtDevicesDto> {
    // Construir el objeto 'where' para establecer las condiciones de la consulta
    const where: Prisma.courts_devicesWhereInput = {
      // Evitar obtener las pistas eliminados
      ...(!checkDeleted && { is_delete: false }),

      // Obtener solo las relaciones del dispositivo actual
      ...{ court_id: courtId },

      ...(dto.deviceId && { device_id: dto.deviceId }),
    };

    // Obtener el modo de ordenación de los elementos
    let orderBy: Prisma.courts_devicesOrderByWithRelationInput[] = [];
    if (dto.orderParams) {
      dto.orderParams.forEach((orderParam) => {
        const field = COURT_DEVICES_ORDER_FIELD_MAP[orderParam.field];
        orderBy.push({
          [field]: orderParam.order,
        });
      });
    }

    // Obtener todas las entradas en las que se relacione un dispositivo con la pista dada
    const courtDevices = await this.prisma.courts_devices.findMany({
      where,
      orderBy,
    });

    // Obtener la información de los dispositivos
    const devices = await Promise.all(
      courtDevices.map(async (cd) => {
        // Obtener el dispositivo de la BD
        const device = await this.prisma.devices.findUnique({ where: { id: cd.device_id } });
        // Verificar los datos obtenidos
        if (!device) {
          throw new NotFoundException(`Device with ID ${cd.device_id} not found.`);
        }
        // Devolver la información formateada con el DTO
        return new ResponseDeviceDto(device);
      }),
    );

    return new ResponseCourtDevicesDto({
      courtId,
      complexId,
      devices,
    });
  }

  /**
   * Retrieves a list of courts associated with a specific device in a complex.
   *
   * @param {number} complexId - The unique identifier of the complex.
   * @param {number} deviceId - The unique identifier of the device.
   * @param {GetDeviceCourtsDto} dto - The data transfer object containing filters and order parameters for the courts.
   * @param {Function} getCourt - Function to get court details by complexId and courtId.
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
    // Construir el objeto 'where' para establecer las condiciones de la consulta
    const where: Prisma.courts_devicesWhereInput = {
      // Evitar obtener las pistas eliminados
      ...(!checkDeleted && { is_delete: false }),

      // Obtener solo las relaciones del dispositivo actual
      ...{ device_id: deviceId },

      ...(dto.courtId && { court_id: dto.courtId }),
    };

    // Obtener el modo de ordenación de los elementos
    let orderBy: Prisma.courts_devicesOrderByWithRelationInput[] = [];
    if (dto.orderParams) {
      dto.orderParams.forEach((orderParam) => {
        const field = DEVICE_COURTS_ORDER_FIELD_MAP[orderParam.field];
        orderBy.push({
          [field]: orderParam.order,
        });
      });
    }

    // Obtener todas las entradas en las que se relacione una pista con el dispositivo dado
    const deviceCourts = await this.prisma.courts_devices.findMany({
      where,
      orderBy,
    });

    // Obtener la información de las pistas
    const courts = await Promise.all(
      deviceCourts.map(async (dc) => {
        // Obtener la pista de la BD
        const court = await this.prisma.courts.findUnique({ where: { id: dc.court_id } });
        // Verificar los datos obtenidos
        if (!court) {
          throw new NotFoundException(`Court with ID ${dc.court_id} not found.`);
        }
        // Devolver la información formateada con el DTO
        return new ResponseCourtDto(court);
      }),
    );

    return new ResponseDeviceCourtsDto({
      deviceId,
      complexId,
      courts,
    });
  }

  /**
   * Associates a list of courts with a specific device. This method updates the existing associations by adding new
   * courts, retaining current ones, and marking removed associations as deleted.
   *
   * @param {number} complexId - The identifier for the sports or device complex.
   * @param {number} deviceId - The identifier for the specific device to associate with the courts.
   * @param {CreateDeviceCourtsDto} dto - An object containing the list of court IDs to be associated with the specified
   * device.
   * @param {Function} getCourt - Function to get court details by complexId and courtId.
   * @return {Promise<ResponseDeviceCourtsDto>} A promise that resolves to an object containing the updated device-court
   * associations.
   */
  async setDeviceCourts(
    complexId: number,
    deviceId: number,
    dto: CreateDeviceCourtsDto,
  ): Promise<ResponseDeviceCourtsDto> {
    // Obtener las pistas actuales asociadas con el dispositivo
    let currentDeviceCourts = (await this.getDeviceCourts(complexId, deviceId, {}, true)).courts;

    try {
      let deviceCourts: ResponseCourtDto[] = [];

      // Procesar todas las pistas
      for (const courtId of dto.courts) {
        const court = currentDeviceCourts.find((court) => court.id === courtId);
        if (court === undefined) {
          // Si la pista actual no está incluida en la lista, crear una nueva entrada
          await this.prisma.courts_devices.create({
            data: {
              court_id: courtId,
              device_id: deviceId,
            },
          });

          // Obtener la pista actual para poder devolverla
          const newCourt = await this.prisma.courts.findUnique({ where: { id: courtId } });
          // Verificar los datos obtenidos
          if (!newCourt) {
            throw new NotFoundException(`Court with ID ${courtId} not found.`);
          }

          // Añadir a la lista final
          deviceCourts.push(new ResponseCourtDto(newCourt));
        } else {
          // Si la pista actual está incluida en la lista, actualizar la entrada para asegurar que no se ha
          // establecido como eliminada
          await this.prisma.courts_devices.update({
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

          // Añadir a la lista final
          deviceCourts.push(court);

          // Eliminar el valor de la lista inicial
          currentDeviceCourts = currentDeviceCourts.filter((court) => court.id !== courtId);
        }

        // Actualizar las entradas restantes para establecerlas como eliminadas
        for (const court of currentDeviceCourts) {
          await this.prisma.courts_devices.update({
            where: {
              court_id_device_id: {
                court_id: court.id,
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
