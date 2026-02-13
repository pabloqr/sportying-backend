import { forwardRef, Inject, Injectable, InternalServerErrorException, OnModuleInit } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import * as ngeohash from 'ngeohash';
import { fetchWeatherApi } from "openmeteo";
import { ResponseComplexWeatherDto } from "src/common/dto";
import { ComplexesService } from "src/complexes/complexes.service";
import { PrismaService } from "src/prisma/prisma.service";
import { WeatherDataDto } from "./dto";
import { AnalysisService } from "src/common/analysis.service";

@Injectable({})
export class WeatherService implements OnModuleInit {
  private activeRequests = new Map<string, Promise<WeatherDataDto>>();

  constructor(
    private prisma: PrismaService,
    private analysisService: AnalysisService,
    @Inject(forwardRef(() => ComplexesService))
    private complexesService: ComplexesService
  ) { }

  /**
   * Fetches and transforms weather data for a given geohash into a WeatherDataDto.
   *
   * Decodes the provided geohash to latitude/longitude, calls the Open-Meteo forecast endpoint (via fetchWeatherApi)
   * requesting hourly precipitation and precipitation probability, current temperature/precipitation/cloud cover, and
   * a 1-day past/forecast window. Uses the first location response returned by the API.
   *
   * Notes:
   * - Time comparisons are performed in UTC; the "current" instant is rounded down to the nearest hour (UTC) before
   *   matching to the hourly array.
   * - Default/fallback sentinel values (-1 or -1.0) are used when hourly indices are out of range to indicate
   *   unavailable data.
   *
   * @param geohash - Geohash string identifying the location to query.
   * @returns Promise that resolves to a WeatherDataDto containing the mapped current and surrounding hourly weather
   *          values.
   * @throws {Error} if geohash decoding fails, the fetchWeatherApi call fails, the API response is empty, or required
   *                 current/hourly data structures are missing or malformed.
   */
  private async fetchWeather(geohash: string): Promise<WeatherDataDto> {
    const loc = ngeohash.decode(geohash);

    const params = {
      latitude: loc.latitude,
      longitude: loc.longitude,
      hourly: ["precipitation_probability", "precipitation"],
      current: [
        "temperature_2m",
        "precipitation",
        "cloud_cover",
        "relative_humidity_2m",
        "wind_speed_10m",
        "wind_direction_10m",
        "wind_gusts_10m",
        "rain",
        "showers",
        "snowfall",
        "apparent_temperature"
      ],
      minutely_15: [
        "temperature_2m",
        "rain",
        "snowfall",
        "precipitation",
        "relative_humidity_2m",
        "wind_speed_10m",
        "wind_direction_10m",
        "wind_gusts_10m",
        "visibility"
      ],
      past_days: 1,
      forecast_days: 1,
      past_minutely_15: 4,
      forecast_minutely_15: 4,
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

  private async updateWeather(geohash: string): Promise<WeatherDataDto> {
    try {
      // Obtener los datos de la API
      const weather = await this.fetchWeather(geohash);

      // Procesar los datos en el módulo de análisis para actualizar el estado de las pistas y las reservas
      // await this.analysisService.processWeatherData({});

      // Crear la entrada en la BD
      // await this.prisma.weather.create({
      //   data: { geohash, ...weather },
      // });

      return new WeatherDataDto({ ...weather });
    } catch (error) {
      throw new InternalServerErrorException(`Error updating data for geohash ${geohash}:`, error.message);
    }
  }

  /**
   * Updates the weather table for active complexes at a near interval.
   *
   * Takes the current instant (in UTC) and normalizes it on the base date 1970 to coincide with TIME fields; calculates
   * an initial instant (now +20 minutes) and a final instant (now +60 minutes), gets the complexes whose
   * opening/closing covers that range, generates unique geohashes (accuracy 5 ≈ 4.9km) of its coordinates, requests the
   * meteorological data for each geohash and creates records in the database.
   *
   * Note: If no active complexes are found the execution ends unchanged. Any failure to obtain external data or insert
   * into the database launches an InternalServerErrorException for the affected geohash.
   *
   * @throws {InternalServerErrorException} When obtaining weather data or inserting into BD fails.
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

    // Procesar los geohashes para obtener los datos de la API y actualizar la BD
    for (const geohash of geohashes) await this.updateWeather(geohash);
  }

  private async purgeWeatherLogic() {
    try {
      // Calcular la fecha límite (1 semana)
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() - 7);
      // expirationData.setHours(expirationDate.getHours - 48);

      // Eliminar las entradas de la BD más antiguas que la fecha límite
      await this.prisma.weather.deleteMany({
        where: { created_at: { lt: expirationDate } },
      });

    } catch (error) {
      throw new InternalServerErrorException(`Error deleting old weather data:`, error.message);
    }
  }

  async onModuleInit() {
    await this.purgeWeatherLogic();
    await this.updateWeatherLogic();
  }

  @Cron('0 */20 * * * *')
  async handleWeatherUpdate() {
    await this.updateWeatherLogic();
  }

  @Cron('0 0 4 * * *')
  async handleWeatherPurge() {
    await this.purgeWeatherLogic();
  }

  async getWeather(geohash: string): Promise<WeatherDataDto> {
    // Obtener la información meteorológica almacenada en la BD
    const weather = await this.prisma.weather.findFirst({
      where: { geohash },
      orderBy: { created_at: 'desc' },
      select: {
        temperature: true,
        relative_humidity_curr: true,
        cloud_cover_curr: true,
        wind_speed_curr: true,
        wind_direction_curr: true,
        precip_intensity_curr: true,
        precip_probability_curr: true,
        precip_probability_next: true,
      }
    });

    // Si se ha obtenido una entrada, devolver los datos
    if (weather !== undefined) return new WeatherDataDto({ ...weather });

    // Si no se ha obtenido ninguna entrada, verificar si ya hay un proceso de actualización
    if (this.activeRequests.has(geohash)) return this.activeRequests[geohash];

    // Si no hay ningún proceso de actualización, iniciarlo (en este caso no hay bloqueo porque no hay await)
    const weatherUpdate = this.updateWeather(geohash).finally(() => {
      // Eliminar la entrada para el geohash actual
      this.activeRequests.delete(geohash);
    });

    // Crear la entrada para el geohash actual
    this.activeRequests.set(geohash, weatherUpdate);

    return weatherUpdate;
  }

  /**
   * Retrieves weather information for a specific complex.
   *
   * Loads the complex by its id, encodes its latitude and longitude into a geohash with precision 5, fetches weather
   * data for that geohash, and returns a DTO containing the complex id and the retrieved weather.
   *
   * @param complexId - The identifier of the complex to retrieve weather for.
   * @returns A Promise that resolves to a ResponseComplexWeatherDto containing the complex id and weather data.
   * @throws If the complex cannot be found or if the weather retrieval fails.
   */
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
