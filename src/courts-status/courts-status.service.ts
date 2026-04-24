import { Injectable } from '@nestjs/common';
import { ResponseCourtStatusDto } from '../common/dto/index.js';
import { ErrorsService } from '../common/errors.service.js';
import { CourtStatusData, CreateCourtStatusDto } from '../courts/dto/index.js';
import { CourtStatus, INACTIVE_COURT_STATUS } from '../courts/enums/index.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class CourtsStatusService {
  constructor(
    private prisma: PrismaService,
    private errorsService: ErrorsService,
  ) {}

  /**
   * Retrieves the most recent status of a specific court.
   *
   * @param {number} complexId - The identifier for the sports complex to which the court belongs.
   * @param {number} courtId - The identifier for the court whose status is to be retrieved.
   * @return {Promise<ResponseCourtStatusDto>} A promise that resolves to the most updated status of the court, or a
   * default status if no recent status is found.
   */
  async getCourtStatus(complexId: number, courtId: number): Promise<ResponseCourtStatusDto> {
    // Tratar de obtener el estado más actualizado de la pista dada
    const status = await this.prisma.courts_status.findFirst({
      where: {
        court_id: courtId,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    // Devolver el objeto obtenido o construir uno con el estado por defecto 'OPEN'
    return new ResponseCourtStatusDto({
      court_id: courtId,
      complex_id: complexId,
      status_data: status ?? {
        status: CourtStatus.OPEN,
        alert_level: 0,
        estimated_drying_time: 0,
      },
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
  async setCourtStatus(complexId: number, courtId: number, dto: CreateCourtStatusDto): Promise<ResponseCourtStatusDto> {
    // Verificar que el cuerpo contiene elementos
    this.errorsService.noBodyError(dto);

    try {
      // Tratar de obtener el estado más actualizado de la pista dada
      const statusPrev = await this.getCourtStatus(complexId, courtId);

      // Actualizar los datos del estado con valores válidos
      const statusData: CourtStatusData = {
        status: dto.status ?? statusPrev.statusData.status,
        alertLevel: dto.alertLevel ?? statusPrev.statusData.alertLevel,
        estimatedDryingTime: dto.estimatedDryingTime ?? statusPrev.statusData.estimatedDryingTime,
      };

      // Si los nuevos valores son iguales a los existentes, devolver el objeto existente
      if (
        statusData.status === statusPrev.statusData.status &&
        statusData.alertLevel == statusPrev.statusData.alertLevel
      ) {
        return new ResponseCourtStatusDto({ ...statusPrev, complex_id: complexId });
      }

      // Actualizar el estado de la pista en función del nivel de alerta
      statusData.status =
        statusData.alertLevel >= 2 && !INACTIVE_COURT_STATUS.has(statusData.status)
          ? CourtStatus.WEATHER
          : statusData.status;

      // Añadir una nueva entrada con el estado de la pista
      const status = await this.prisma.courts_status.create({
        data: {
          court_id: courtId,
          status: statusData.status,
          alert_level: statusData.alertLevel,
          estimated_drying_time: statusData.estimatedDryingTime,
          created_at: new Date(),
        },
      });

      return new ResponseCourtStatusDto({
        court_id: courtId,
        complex_id: complexId,
        status_data: status,
      });
    } catch (error) {
      this.errorsService.dbError(error, {
        p2025: `Court with ID ${courtId} not found.`,
      });

      throw error;
    }
  }
}

