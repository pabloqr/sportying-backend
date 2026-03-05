import { IsNotEmpty, IsNumber } from "class-validator";
import { ResponseWeatherDataDto } from "src/common/dto";

export class WeatherDataDto extends ResponseWeatherDataDto {
  @IsNumber()
  @IsNotEmpty()
  alert_level: number;

  constructor(weatherData: any) {
    super(weatherData);

    this.alert_level = weatherData.alert_level ?? weatherData.alertLevel;
  }
}