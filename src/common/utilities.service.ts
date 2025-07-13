import { Injectable } from '@nestjs/common';

@Injectable()
export class UtilitiesService {
  public stringToDate(dateString: string): Date {
    const [hoursString, minutesString] = dateString.split(':');
    const hours = parseInt(hoursString);
    const minutes = parseInt(minutesString);

    const date = new Date();
    date.setHours(hours, minutes, 0, 0);

    return date;
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
