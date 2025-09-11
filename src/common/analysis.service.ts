import { Injectable } from '@nestjs/common';
import { CourtsService } from '../courts/courts.service';
import { DeviceType } from '../devices/enum';
import { ReservationsService } from '../reservations/reservations.service';
import { UtilitiesService } from './utilities.service';
import { ReservationStatus } from '../reservations/enums';

@Injectable({})
export class AnalysisService {
  constructor(
    private utilitiesService: UtilitiesService,
    private courtsService: CourtsService,
    private reservationsService: ReservationsService,
  ) {}

  private async processAvailabilityTelemetry(
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

    let reservationStatus = ReservationStatus.OCCUPIED;
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

      reservationStatus = ReservationStatus.CANCELLED;
    }

    await this.reservationsService.setReservationStatus(
      current.id,
      reservationStatus,
    );
  }

  private async processRainTelemetry(
    deviceId: number,
    rainIntensity: number,
    courts: number[],
  ) {}

  async processDeviceTelemetry(
    deviceId: number,
    type: DeviceType,
    value: number,
    timestamp: Date,
    courts: number[],
  ): Promise<void> {
    if (!courts.length) return;

    switch (type) {
      case DeviceType.PRESENCE:
        await this.processAvailabilityTelemetry(!value, timestamp, courts[0]);
        break;
      case DeviceType.RAIN:
        await this.processRainTelemetry(deviceId, value, courts);
        break;
    }
  }
}
