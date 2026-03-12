import { Injectable } from '@nestjs/common';
import { ResponseReservationDto } from 'src/common/dto';
import { ErrorsService } from 'src/common/errors.service';
import { UtilitiesService } from 'src/common/utilities.service';
import { CourtsStatusService } from 'src/courts-status/courts-status.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ReservationAvailabilityStatus } from 'src/reservations/enums';

@Injectable()
export class ReservationsStatusService {
  constructor(
    private prisma: PrismaService,
    private errorsService: ErrorsService,
    private utilitiesService: UtilitiesService,
    private courtsStatusService: CourtsStatusService,
  ) { }

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
          updated_at: new Date(),
        },
      });

      const timeFilter = this.utilitiesService.getTimeFilterFromDate(reservation.date_end);

      const statusData = (
        await this.courtsStatusService.getCourtStatus(reservation.complex_id, reservation.court_id)
      ).statusData;

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
}
