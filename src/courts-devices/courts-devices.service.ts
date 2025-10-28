import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ErrorsService } from '../common/errors.service';
import { Prisma } from '@prisma/client';
import {
  ResponseCourtDevicesDto,
  ResponseCourtDto,
  ResponseDeviceCourtsDto,
  ResponseDeviceDto,
} from '../common/dto';
import {
  COURT_DEVICES_ORDER_FIELD_MAP,
  GetCourtDevicesDto,
} from '../courts/dto';
import {
  CreateDeviceCourtsDto,
  DEVICE_COURTS_ORDER_FIELD_MAP,
  GetDeviceCourtsDto,
} from '../devices/dto';

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
    getDevice: (
      complexId: number,
      deviceId: number,
    ) => Promise<ResponseDeviceDto>,
    checkDeleted: boolean = false,
  ): Promise<ResponseCourtDevicesDto> {
    // Se construye el objeto 'where' para establecer las condiciones de la consulta
    const where: Prisma.courts_devicesWhereInput = {
      // Se evita obtener las pistas eliminados
      ...(!checkDeleted && { is_delete: false }),

      // Se obtienen solo las relaciones del dispositivo actual
      ...{ court_id: courtId },

      ...(dto.deviceId !== undefined && { device_id: dto.deviceId }),
    };

    // Se obtiene el modo de ordenación de los elementos
    let orderBy: Prisma.courts_devicesOrderByWithRelationInput[] = [];
    if (dto.orderParams !== undefined) {
      dto.orderParams.forEach((orderParam) => {
        const field = COURT_DEVICES_ORDER_FIELD_MAP[orderParam.field];
        orderBy.push({
          [field]: orderParam.order,
        });
      });
    }

    // Se obtienen todas las entradas en las que se relacione un dispositivo con la pista dada
    const courtDevices = await this.prisma.courts_devices.findMany({
      where,
      orderBy,
    });

    const devices = await Promise.all(
      courtDevices.map((cd) => getDevice(complexId, cd.device_id)),
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
    getCourt: (complexId: number, courtId: number) => Promise<ResponseCourtDto>,
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

    const courts = await Promise.all(
      deviceCourts.map((dc) => getCourt(complexId, dc.court_id)),
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
    getCourt: (complexId: number, courtId: number) => Promise<ResponseCourtDto>,
  ): Promise<ResponseDeviceCourtsDto> {
    // Se obtienen las pistas actuales asociadas con el dispositivo
    let currentDeviceCourts = (
      await this.getDeviceCourts(complexId, deviceId, {}, getCourt, true)
    ).courts;

    try {
      let deviceCourts: ResponseCourtDto[] = [];

      // Se procesan todas las pistas
      for (const courtId of dto.courts) {
        const court = currentDeviceCourts.find((court) => court.id === courtId);
        if (court === undefined) {
          // Si la pista actual no está incluida en la lista, se crea una nueva entrada
          await this.prisma.courts_devices.create({
            data: {
              court_id: courtId,
              device_id: deviceId,
            },
          });

          // Se obtiene el dispositivo actual para poder devolverlo
          const newCourt = await getCourt(complexId, courtId);

          // Se añade a la lista final
          deviceCourts.push(newCourt);
        } else {
          // Si la pista actual está incluida en la lista, se actualiza la entrada para asegurar que no se ha
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

          // Se añade a la lista final
          deviceCourts.push(court);

          // Se elimina el valor de la lista inicial
          currentDeviceCourts = currentDeviceCourts.filter(
            (court) => court.id !== courtId,
          );
        }

        // Se actualizan las entradas restantes para establecerlas como eliminadas
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
