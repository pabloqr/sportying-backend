import { Type } from "class-transformer";
import { IsNotEmpty, IsNumber, ValidateNested } from "class-validator";
import { ResponseWeatherDataDto } from "./response-weater-data.dto";

export class ResponseComplexWeatherDto {
  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  id: number;

  @Type(() => ResponseWeatherDataDto)
  @ValidateNested()
  @IsNotEmpty()
  weather: ResponseWeatherDataDto;

  constructor(weather: any) {
    this.id = weather.id;
    this.weather = weather.weather;
  }
}