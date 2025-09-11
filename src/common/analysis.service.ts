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
   * Processes availability telemetry data by checking if a court is available at a given time
   * and updating the reservation status accordingly.
   *
   * @param {boolean} available - Indicates whether the court is available.
   * @param {Date} timestamp - The timestamp to check against current reservations.
   * @param {number} court - The ID of the court to process availability for.
   * @return {Promise<void>} A promise that resolves when the reservation status is updated.
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

  async processRainTelemetry(
    complexId: number,
    previousRainIntensity: number,
    rainIntensity: number,
    courtIds: number[],
  ) {
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
