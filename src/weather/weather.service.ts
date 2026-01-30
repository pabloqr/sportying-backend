import { forwardRef, Inject, Injectable, InternalServerErrorException, OnModuleInit } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import * as ngeohash from 'ngeohash';
import { fetchWeatherApi } from "openmeteo";
import { ResponseComplexWeatherDto } from "src/common/dto";
import { ComplexesService } from "src/complexes/complexes.service";
import { PrismaService } from "src/prisma.service";
import { WeatherDataDto } from "./dto";

@Injectable({})
export class WeatherService implements OnModuleInit {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => ComplexesService))
    private complexesService: ComplexesService
  ) { }

  /**
   * Fetches and transforms weather data for a given geohash into a WeatherDataDto.
   *
   * Decodes the provided geohash to latitude/longitude, calls the Open-Meteo
   * forecast endpoint (via fetchWeatherApi) requesting hourly precipitation and
   * precipitation probability, current temperature/precipitation/cloud cover, and
   * a 1-day past/forecast window. Uses the first location response returned by
   * the API.
   *
   * Notes:
   * - Time comparisons are performed in UTC; the "current" instant is rounded
   *   down to the nearest hour (UTC) before matching to the hourly array.
   * - Default/fallback sentinel values (-1 or -1.0) are used when hourly indices
   *   are out of range to indicate unavailable data.
   *
   * @param geohash - Geohash string identifying the location to query.
   * @returns Promise that resolves to a WeatherDataDto containing the mapped
   *          current and surrounding hourly weather values.
   * @throws {Error} if geohash decoding fails, the fetchWeatherApi call fails,
   *                 the API response is empty, or required current/hourly data
   *                 structures are missing or malformed.
   */
  private async fetchWeather(geohash: string): Promise<WeatherDataDto> {
    const loc = ngeohash.decode(geohash);

    const params = {
      latitude: loc.latitude,
      longitude: loc.longitude,
      hourly: ["precipitation_probability", "precipitation"],
      current: ["temperature_2m", "precipitation", "cloud_cover"],
      past_days: 1,
      forecast_days: 1,
    };
    const url = "https://api.open-meteo.com/v1/forecast";
    const responses = await fetchWeatherApi(url, params);

    // Obtener la primera ubicación
    const response = responses[0];

    // Obtener los datos meteorológicos actuales y por horas
    const current = response.current()!;
    const hourly = response.hourly()!;

    // Calcular el array de horas proporcionado en la respuesta
    const hours = Array.from(
      { length: (Number(hourly.timeEnd()) - Number(hourly.time())) / hourly.interval() },
      (_, i) =>
        new Date(
          (Number(hourly.time()) + i * hourly.interval()) * 1000
        )
    );

    // Obtener el instante actual (tiempo UTC) y redondear a la hora actual
    const now = new Date();
    now.setUTCMinutes(0, 0, 0);

    // Obtener la posición de la hora actual en el array de horas
    const currIndex = hours.findIndex((hour) => hour.getTime() === now.getTime());

    // Calcular la validez de los índices buscados
    const prevValidIndex = currIndex - 1 >= 0 && currIndex - 1 < hours.length;
    const currValidIndex = currIndex >= 0 && currIndex < hours.length;
    const nextValidIndex = currIndex + 1 >= 0 && currIndex + 1 < hours.length;

    // Devolver los datos obteniéndolos de la respuesta proporcionada por la API
    return new WeatherDataDto({
      temperature: current.variables(0)!.value(),
      precip_intensity_prev: prevValidIndex ? hourly.variables(1)!.valuesArray()[currIndex - 1] : -1.0,
      precip_intensity_curr: current.variables(1)!.value(),
      precip_probability_curr: currValidIndex ? hourly.variables(0)!.valuesArray()[currIndex] : -1,
      precip_probability_next: nextValidIndex ? hourly.variables(0)!.valuesArray()[currIndex + 1] : -1,
      cloud_cover: current.variables(2)!.value(),
    });
  }

  /**
   * Actualiza la tabla de weather para los complejos activos en un intervalo próximo.
   *
   * Toma el instante actual (en UTC) y lo normaliza sobre la fecha base 1970 para coincidir con campos TIME;
   * calcula un instante inicial (ahora +20 minutos) y un instante final (ahora +60 minutos), consulta los
   * complejos cuya apertura/cierre cubren ese rango, genera geohashes únicos (precisión 5 ≈ 4.9km) de sus
   * coordenadas, solicita los datos meteorológicos para cada geohash y crea registros en la base de datos.
   *
   * Nota: Si no se encuentran complejos activos la ejecución termina sin cambios. Cualquier fallo al obtener
   * datos externos o al insertar en la BD lanza una InternalServerErrorException para el geohash afectado.
   *
   * @throws {InternalServerErrorException} Cuando la obtención de datos meteorológicos o la inserción en BD falla.
   */
  private async updateWeatherLogic() {
    const now = new Date();

    // Crear el instante actual con fecha base 1970 (para coincidir con el tipo TIME de Prisma)
    const currentTime = new Date(1970, 0, 1, now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds());
    // Añadir 20 minutos para obtener el instante inicial
    const targetTimeIni = new Date(currentTime.getTime() + 20 * 60000);
    // Añadir 1 hora para obtener el instante final
    const targetTimeEnd = new Date(currentTime.getTime() + 60 * 60000);

    // Obtener complejos activos (20 min antes de abrir hasta el cierre)
    const activeComplexes = await this.prisma.complexes.findMany({
      where: {
        time_ini: {
          lte: targetTimeIni,
        },
        time_end: {
          gte: targetTimeEnd,
        },
      },
      select: {
        loc_longitude: true,
        loc_latitude: true,
      },
    });

    // Si no hay complejos, finalizar la ejecución
    if (activeComplexes.length === 0) return;

    // Generar geohashes únicos (Precisión 5 = ~4.9km x 4.9km)
    const geohashes = new Set<string>(
      activeComplexes.map(complex => ngeohash.encode(complex.loc_latitude, complex.loc_longitude, 5))
    );

    // Procesar los geohashes para obtener los datos de la API y actualizar BD
    for (const geohash of geohashes) {
      try {
        // Obtener los datos de la API
        const weather = await this.fetchWeather(geohash);

        // Crear la entrada en la BD
        await this.prisma.weather.create({
          data: {
            geohash,
            temperature: weather.temperature,
            precip_intensity_prev: weather.precip_intensity_prev,
            precip_intensity_curr: weather.precip_intensity_curr,
            precip_probability_curr: weather.precip_probability_curr,
            precip_probability_next: weather.precip_probability_next,
            cloud_cover: weather.cloud_cover
          },
        });
      } catch (error) {
        throw new InternalServerErrorException(`Error actualizando geohash ${geohash}:`, error.message);
      }
    }
  }

  async onModuleInit() {
    await this.updateWeatherLogic();
  }

  @Cron('0 */20 * * * *')
  async handleWeatherUpdate() {
    await this.updateWeatherLogic();
  }

  async getWeather(geohash: string): Promise<WeatherDataDto> {
    // Obtener la información meteorológica almacenada en la BD
    const weather = await this.prisma.weather.findFirst({
      where: { geohash },
      orderBy: { created_at: 'desc' }
    });

    return new WeatherDataDto({ ...weather });
  }

  async getComplexWeather(complexId: number): Promise<ResponseComplexWeatherDto> {
    // Obtener los datos del complejo pedido
    const complex = await this.complexesService.getComplex(complexId);

    // Obtener el geohash de las coordenadas del complejo
    const geohash = ngeohash.encode(complex.locLatitude, complex.locLongitude, 5);
    // Obtener los datos meteorológicos del complejo
    const weather = await this.getWeather(geohash);

    return new ResponseComplexWeatherDto({ id: complex.id, weather });
  }
}
