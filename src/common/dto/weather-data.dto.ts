import { IsNotEmpty, IsNumber } from "class-validator";

export class WeatherDataDto {
  @IsNumber()
  @IsNotEmpty()
  temperature: number;

  @IsNumber()
  @IsNotEmpty()
  precip_intensity: number;

  @IsNumber()
  @IsNotEmpty()
  precip_probability_prev: number;

  @IsNumber()
  @IsNotEmpty()
  precip_probability_curr: number;

  @IsNumber()
  @IsNotEmpty()
  precip_probability_next: number;

  @IsNumber()
  @IsNotEmpty()
  cloud_cover: number;

  constructor(weatherData: any) {
    this.temperature = weatherData.temperature;
    this.precip_intensity = weatherData.precipIntensity ?? weatherData.precip_intensity;
    this.precip_probability_prev = weatherData.precipProbabilityPrev ?? weatherData.precip_probability_prev;
    this.precip_probability_curr = weatherData.precipProbabilityCurr ?? weatherData.precip_probability_curr;
    this.precip_probability_next = weatherData.precipProbabilityNext ?? weatherData.precip_probability_next;
    this.cloud_cover = weatherData.cloudCover ?? weatherData.cloud_cover;
  }
}