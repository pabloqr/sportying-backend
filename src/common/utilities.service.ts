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
}
