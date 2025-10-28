import { Injectable } from '@nestjs/common';

@Injectable()
export class UtilitiesService {
  public dateIsBetween(date: Date, start: Date, end: Date): boolean {
    return date >= start && date <= end;
  }

  public dateIsEqualOrLower(
    minutes: number,
    dateA: Date,
    dateB: Date,
  ): boolean {
    const diff = Math.abs(dateA.getTime() - dateB.getTime());
    return diff <= minutes * 60 * 1000;
  }

  public dateIsEqualOrGreater(
    minutes: number,
    dateA: Date,
    dateB: Date,
  ): boolean {
    const diff = Math.abs(dateA.getTime() - dateB.getTime());
    return diff >= minutes * 60 * 1000;
  }

  public stringToDate(dateString: string): Date {
    const [hoursString, minutesString] = dateString.split(':');
    const hours = parseInt(hoursString);
    const minutes = parseInt(minutesString);

    const date = new Date();
    date.setHours(hours, minutes, 0, 0);

    return date;
  }

  public getTimeBlock(): { dateIni: Date; dateEnd: Date } {
    const now = new Date();

    const dateIni = new Date(now);
    dateIni.setMinutes(now.getMinutes() < 30 ? 0 : 30, 0, 0);

    const minEnd = new Date(now.getTime() + 60 * 60 * 1000);

    const dateEnd = new Date(minEnd);
    dateEnd.setMinutes(minEnd.getMinutes() < 30 ? 30 : 0, 0, 0);
    if (minEnd.getMinutes() >= 30) {
      dateEnd.setHours(dateEnd.getHours() + 1);
    }

    return { dateIni, dateEnd };
  }

  public groupArrayByField<T>(
    array: T[],
    field: keyof T,
  ): Map<T[typeof field], T[]> {
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
}
