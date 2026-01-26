import { IsNotEmpty, IsNumber } from "class-validator";

export class WeatherDataDto {
  @IsNumber()
  @IsNotEmpty()
  temperature: number;

  @IsNumber()
  @IsNotEmpty()
  precip_intensity_prev: number;

  @IsNumber()
  @IsNotEmpty()
  precip_intensity_curr: number;

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
    this.precip_intensity_prev = weatherData.precipIntensityPrev ?? weatherData.precip_intensity_prev;
    this.precip_intensity_curr = weatherData.precipIntensityCurr ?? weatherData.precip_intensity_curr;
    this.precip_probability_curr = weatherData.precipProbabilityCurr ?? weatherData.precip_probability_curr;
    this.precip_probability_next = weatherData.precipProbabilityNext ?? weatherData.precip_probability_next;
    this.cloud_cover = weatherData.cloudCover ?? weatherData.cloud_cover;
  }
}