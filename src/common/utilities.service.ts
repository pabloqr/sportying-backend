import { Injectable } from '@nestjs/common';
import { CourtStatus } from 'src/courts/enums';
import { ReservationAvailabilityStatus, ReservationStatus, ReservationTimeFilter } from 'src/reservations/enums';

@Injectable()
export class UtilitiesService {
  public dateIsBetween(date: Date, start: Date, end: Date): boolean {
    return date >= start && date <= end;
  }

  public dateIsEqualOrLower(minutes: number, dateA: Date, dateB: Date): boolean {
    const diff = Math.abs(dateA.getTime() - dateB.getTime());
    return diff <= minutes * 60 * 1000;
  }

  public dateIsEqualOrGreater(minutes: number, dateA: Date, dateB: Date): boolean {
    const diff = Math.abs(dateA.getTime() - dateB.getTime());
    return diff >= minutes * 60 * 1000;
  }

  public timeIsEqualOrLower(dateA: Date, dateB: Date): boolean {
    const timeA = dateA.getHours() * 60 + dateA.getMinutes();
    const timeB = dateB.getHours() * 60 + dateB.getMinutes();

    return timeA <= timeB;
  }

  public timeIsEqualOrGreater(dateA: Date, dateB: Date): boolean {
    const timeA = dateA.getHours() * 60 + dateA.getMinutes();
    const timeB = dateB.getHours() * 60 + dateB.getMinutes();

    return timeA >= timeB;
  }

  public stringToDate(dateString: string): Date {
    const [hoursString, minutesString] = dateString.split(':');
    const hours = parseInt(hoursString);
    const minutes = parseInt(minutesString);

    const date = new Date();
    date.setHours(hours, minutes, 0, 0);

    return date;
  }

  public getTimeBlock(time: number = 60): { dateIni: Date; dateEnd: Date } {
    // Obtener el instante de tiempo actual
    const now = new Date();

    // Redondear a la media hora previa al instante actual
    const dateIni = new Date(now);
    dateIni.setMinutes(now.getMinutes() < 30 ? 0 : 30, 0, 0);

    // Calcular el instante final con la diferencia de tiempo dada
    const minEnd = new Date(now.getTime() + time * 60 * 1000);

    // Redondear a la media hora posterior al instante final calculado
    const dateEnd = new Date(minEnd);
    dateEnd.setMinutes(minEnd.getMinutes() < 30 ? 30 : 0, 0, 0);
    if (minEnd.getMinutes() >= 30) {
      dateEnd.setHours(dateEnd.getHours() + 1);
    }

    // Devolver la franja calculada, de 90 minutos
    return { dateIni, dateEnd };
  }

  public groupArrayByField<T>(array: T[], field: keyof T): Map<T[typeof field], T[]> {
    const map = new Map<T[typeof field], T[]>();

    array.forEach((item) => {
      // Se obtiene el valor del campo por el que se agrupa
      const key = item[field];

      // Si no existe, se crea la entrada en el diccionario
      if (!map.has(key)) map.set(key, []);

      // Se añade la entrada al diccionario
      map.get(key)!.push(item);
    });

    return map;
  }

  /**
   * Determines the reservation time filter based on the provided date.
   *
   * @param {Date} date - The date to evaluate for determining the time filter.
   * @return {ReservationTimeFilter} Returns PAST if the date is earlier than the current date,
   *  otherwise returns UPCOMING.
   */
  public getTimeFilterFromDate(date: Date): ReservationTimeFilter {
    return date < new Date() ? ReservationTimeFilter.PAST : ReservationTimeFilter.UPCOMING;
  }

  public getReservationStatus(
    status: ReservationAvailabilityStatus,
    courtStatus: CourtStatus,
    timeFilter: ReservationTimeFilter,
  ): ReservationStatus {
    let reservationStatus = ReservationStatus.SCHEDULED;
    if (timeFilter === ReservationTimeFilter.UPCOMING) {
      switch (courtStatus) {
        case CourtStatus.OPEN:
          break;
        case CourtStatus.WEATHER:
          reservationStatus = ReservationStatus.WEATHER;
          break;
        case CourtStatus.BLOCKED:
        case CourtStatus.MAINTENANCE:
          reservationStatus = ReservationStatus.CANCELLED;
          break;
      }
    } else if (timeFilter === ReservationTimeFilter.PAST) {
      switch (status) {
        case ReservationAvailabilityStatus.CANCELLED:
          reservationStatus = ReservationStatus.CANCELLED;
          break;
        default:
          reservationStatus = ReservationStatus.COMPLETED;
          break;
      }
    }

    return reservationStatus;
  }
}
