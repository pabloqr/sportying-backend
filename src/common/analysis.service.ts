import { Injectable } from '@nestjs/common';
import { CourtsService } from '../courts/courts.service';
import { ReservationsService } from '../reservations/reservations.service';
import { UtilitiesService } from './utilities.service';
import { ReservationAvailabilityStatus } from '../reservations/enums';
import { CourtStatus } from '../courts/enums';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable({})
export class AnalysisService {
  constructor(
    private utilitiesService: UtilitiesService,
    private courtsService: CourtsService,
    private reservationsService: ReservationsService,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * Processes availability telemetry for a specified court and updates reservation statuses accordingly.
   *
   * @param {boolean} available - Indicates whether the court is currently available or not.
   * @param {Date} timestamp - The timestamp of the availability telemetry.
   * @param {number} court - The unique identifier of the court for which telemetry is being processed.
   * @return {Promise<void>} - A promise that resolves once the operation is completed.
   */
  async processAvailabilityTelemetry(
    available: boolean,
    timestamp: Date,
    court: number,
  ): Promise<void> {
    const reservations = await this.reservationsService.getReservations({
      courtId: court,
    });

    const current = reservations.find((reservation) =>
      this.utilitiesService.dateIsBetween(
        timestamp,
        reservation.dateIni,
        reservation.dateEnd,
      ),
    );

    if (!current) return;

    let reservationStatus = ReservationAvailabilityStatus.OCCUPIED;
    if (available) {
      if (
        !this.utilitiesService.dateIsEqualOrGreater(
          15,
          current.dateIni,
          timestamp,
        )
      ) {
        return;
      }

      reservationStatus = ReservationAvailabilityStatus.CANCELLED;
    }

    await this.reservationsService.setReservationStatus(
      current.id,
      reservationStatus,
    );

    this.notificationsService.notifyReservationChange(
      current.complexId,
      current.id,
      reservationStatus,
    );
  }

  /**
   * Processes rain telemetry data to update the status of courts and send notifications
   * based on current and previous rain intensity.
   *
   * @param {number} complexId - The identifier for the complex containing the courts.
   * @param {number} previousRainIntensity - The rain intensity recorded previously.
   * @param {number} rainIntensity - The current rain intensity.
   * @param {number[]} courtIds - An array of identifiers for the courts within the complex.
   * @return {Promise<void>} A promise that resolves when the process is complete.
   */
  async processRainTelemetry(
    complexId: number,
    previousRainIntensity: number,
    rainIntensity: number,
    courtIds: number[],
  ): Promise<void> {
    for (const courtId of courtIds) {
      const courtStatus =
        rainIntensity > 0 || previousRainIntensity > 0
          ? CourtStatus.WEATHER
          : CourtStatus.OPEN;

      const court = await this.courtsService.getCourt(complexId, courtId);
      if (court.status !== courtStatus) {
        await this.courtsService.setCourtStatus(complexId, courtId, {
          status: courtStatus,
        });

        this.notificationsService.notifyCourtStatusChange(
          complexId,
          courtId,
          courtStatus,
        );
      }
    }
  }
}
