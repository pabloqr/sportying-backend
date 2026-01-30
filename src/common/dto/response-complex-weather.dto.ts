import { Type } from "class-transformer";
import { IsNotEmpty, IsNumber, ValidateNested } from "class-validator";
import { WeatherDataDto } from "src/weather/dto";

export class ResponseComplexWeatherDto {
  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  id: number;

  @Type(() => WeatherDataDto)
  @ValidateNested()
  @IsNotEmpty()
  weather: WeatherDataDto;

  constructor(weather: any) {
    this.id = weather.id;
    this.weather = weather.weather;
  }
}