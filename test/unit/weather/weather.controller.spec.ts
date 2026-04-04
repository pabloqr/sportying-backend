import { Test, TestingModule } from '@nestjs/testing';
import { ResponseComplexWeatherDto } from '../../../src/common/dto';
import { WeatherController } from '../../../src/weather/weather.controller';
import { WeatherService } from '../../../src/weather/weather.service';

//--------------------------------------------------------------------------------------------------------------------//
// Mock factories
//--------------------------------------------------------------------------------------------------------------------//

const mockWeatherService = {
  getWeatherFromId: jest.fn(),
};

//--------------------------------------------------------------------------------------------------------------------//
// Test suite
//--------------------------------------------------------------------------------------------------------------------//

describe('WeatherController', () => {
  let controller: WeatherController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WeatherController],
      providers: [{ provide: WeatherService, useValue: mockWeatherService }],
    }).compile();

    controller = module.get<WeatherController>(WeatherController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('loads the complex weather and wraps it in ResponseComplexWeatherDto', async () => {
    const weather = { temperature: 21, humidity: 45 };
    mockWeatherService.getWeatherFromId.mockResolvedValue(weather);

    const result = await controller.getComplexWeather(5);

    expect(mockWeatherService.getWeatherFromId).toHaveBeenCalledWith(5);
    expect(result).toBeInstanceOf(ResponseComplexWeatherDto);
    expect(result).toEqual({ id: 5, weather });
  });
});
