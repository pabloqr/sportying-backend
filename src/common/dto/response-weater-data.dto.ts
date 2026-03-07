import { IsInt, IsNotEmpty, IsNumber } from "class-validator";

export class ResponseWeatherDataDto {
  @IsNumber()
  @IsNotEmpty()
  temperature_curr: number;

  @IsNumber()
  @IsNotEmpty()
  relative_humidity_curr: number;

  @IsNumber()
  @IsNotEmpty()
  cloud_cover_curr: number;

  @IsNumber()
  @IsNotEmpty()
  wind_speed_curr: number;

  @IsNumber()
  @IsNotEmpty()
  wind_direction_curr: number;

  @IsNumber()
  @IsNotEmpty()
  precip_intensity_curr: number;

  @IsNumber()
  @IsNotEmpty()
  precip_probability_curr: number;

  @IsNumber()
  @IsNotEmpty()
  precip_probability_next: number;

  @IsInt()
  @IsNotEmpty()
  estimated_drying_time: number;

  @IsInt()
  @IsNotEmpty()
  alert_level: number;

  constructor(weatherData: any) {
    this.temperature_curr = weatherData.temperatureCurr ?? weatherData.temperature_curr;
    this.relative_humidity_curr = weatherData.relativeHumidityCurr ?? weatherData.relative_humidity_curr;
    this.cloud_cover_curr = weatherData.cloudCoverCurr ?? weatherData.cloud_cover_curr;
    this.wind_speed_curr = weatherData.windSpeedCurr ?? weatherData.wind_speed_curr;
    this.wind_direction_curr = weatherData.windDirectionCurr ?? weatherData.wind_direction_curr;
    this.precip_intensity_curr = weatherData.precipIntensityCurr ?? weatherData.precip_intensity_curr;
    this.precip_probability_curr = weatherData.precipProbabilityCurr ?? weatherData.precip_probability_curr;
    this.precip_probability_next = weatherData.precipProbabilityNext ?? weatherData.precip_probability_next;
    this.estimated_drying_time = weatherData.estimated_drying_time ?? weatherData.estimatedDryingTime;
    this.alert_level = weatherData.alert_level ?? weatherData.alertLevel;
  }
}