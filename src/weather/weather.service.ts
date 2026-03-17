import { Injectable, InternalServerErrorException, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import * as ngeohash from 'ngeohash';
import { fetchWeatherApi } from 'openmeteo';
import { AnalysisService, WeatherData } from 'src/common/analysis.service';
import { ResponseWeatherDataDto } from 'src/common/dto';
import { PrismaService } from 'src/prisma/prisma.service';

interface RawWeatherData {
  // Datos actuales (current)
  temperature_2m: number;
  relative_humidity_2m: number;
  cloud_cover: number;
  wind_speed_10m: number;
  wind_direction_10m: number;
  wind_gusts_10m: number;
  rain: number;
  showers: number;
  // Datos horarios (hourly)
  precip_probability_prev: number;
  precip_probability_curr: number;
  precip_probability_next: number;
  precip_intensity_prev: number;
  // Datos de 15 minutos (minutely_15)
  rain_15min: number[];
  precipitation_15min: number[];
}

@Injectable({})
export class WeatherService implements OnModuleInit {
  private activeRequests = new Map<string, Promise<ResponseWeatherDataDto>>();

  constructor(
    private prisma: PrismaService,
    private analysisService: AnalysisService,
  ) {}

  /**
   * Transforms raw weather API data into a WeatherDataDto for database persistence.
   * Maps the raw API response fields to their corresponding DTO properties.
   *
   * @param raw - RawWeatherData object containing API response fields.
   * @returns A new WeatherDataDto instance with mapped weather values.
   */
  private toWeatherDataDto(raw: RawWeatherData): ResponseWeatherDataDto {
    return new ResponseWeatherDataDto({
      temperature_curr: raw.temperature_2m,
      relative_humidity_curr: raw.relative_humidity_2m,
      cloud_cover_curr: raw.cloud_cover,
      wind_speed_curr: raw.wind_speed_10m,
      wind_direction_curr: raw.wind_direction_10m,
      precip_intensity_curr: raw.rain,
      precip_probability_curr: raw.precip_probability_curr,
      precip_probability_next: raw.precip_probability_next,
    });
  }

  /**
   * Transforms raw weather API data into a WeatherData object for analysis processing.
   * Maps raw API fields to camelCase properties used by the analysis service.
   *
   * @param raw - RawWeatherData object containing API response fields.
   * @returns A WeatherData object with camelCase field names ready for analysis processing.
   */
  private toWeatherData(raw: RawWeatherData): WeatherData {
    return {
      temperatureCurr: raw.temperature_2m,
      relativeHumidityCurr: raw.relative_humidity_2m,
      cloudCoverCurr: raw.cloud_cover,
      windSpeedCurr: raw.wind_speed_10m,
      windGustsCurr: raw.wind_gusts_10m,
      rainCurr: raw.rain,
      showersCurr: raw.showers,
      rain15Min: raw.rain_15min,
      precipitation15Min: raw.precipitation_15min,
      surfaceWaterPrev: 0,
      precipitationProbabilityNext: raw.precip_probability_next,
      alertLevelPrev: 0,
      alertLevelTicksPrev: 0,
    };
  }

  /**
   * Fetches and transforms weather data for a given geohash into RawWeatherData.
   *
   * Decodes the provided geohash to latitude/longitude, calls the Open-Meteo forecast endpoint (via fetchWeatherApi)
   * requesting hourly precipitation and precipitation probability, current temperature/precipitation/cloud cover,
   * 15-minute minutely data, and a 1-day past/forecast window. Uses the first location response returned by the API.
   *
   * Notes:
   * - Time comparisons are performed in UTC; the "current" instant is rounded down to the nearest hour (UTC) before
   *   matching to the hourly array.
   * - Default/fallback sentinel values (-1 or -1.0) are used when hourly indices are out of range to indicate
   *   unavailable data.
   * - 15-minute data is extracted for the last 1 hour (past 4 slots) to support precipitation analysis.
   *
   * @param geohash - Geohash string identifying the location to query.
   * @returns Promise that resolves to raw weather data containing current and surrounding hourly/minutely values.
   * @throws {Error} if geohash decoding fails, the fetchWeatherApi call fails, the API response is empty, or required
   *                 current/hourly data structures are missing or malformed.
   */
  private async fetchWeather(geohash: string): Promise<RawWeatherData> {
    const loc = ngeohash.decode(geohash);

    const params = {
      latitude: loc.latitude,
      longitude: loc.longitude,
      hourly: ['precipitation_probability', 'precipitation'],
      current: [
        'temperature_2m',
        'precipitation',
        'cloud_cover',
        'relative_humidity_2m',
        'wind_speed_10m',
        'wind_direction_10m',
        'wind_gusts_10m',
        'rain',
        'showers',
        'snowfall',
        'apparent_temperature',
      ],
      minutely_15: [
        'temperature_2m',
        'rain',
        'snowfall',
        'precipitation',
        'relative_humidity_2m',
        'wind_speed_10m',
        'wind_direction_10m',
        'wind_gusts_10m',
        'visibility',
      ],
      past_days: 1,
      forecast_days: 1,
      past_minutely_15: 4,
      forecast_minutely_15: 4,
    };
    const url = 'https://api.open-meteo.com/v1/forecast';
    const responses = await fetchWeatherApi(url, params);

    // Obtener la primera ubicación
    const response = responses[0];

    // Obtener los datos meteorológicos actuales, por horas y cada 15 minutos
    const current = response.current()!;
    const hourly = response.hourly()!;
    const minutely15 = response.minutely15()!;

    // Calcular el array de horas proporcionado en la respuesta
    const hours = Array.from(
      { length: (Number(hourly.timeEnd()) - Number(hourly.time())) / hourly.interval() },
      (_, i) => new Date((Number(hourly.time()) + i * hourly.interval()) * 1000),
    );

    // Obtener el instante actual (tiempo UTC) y redondear a la hora actual
    const now = new Date();
    now.setUTCMinutes(0, 0, 0);

    // Obtener la posición de la hora actual en el array de horas
    const currIndex = hours.findIndex((hour) => hour.getTime() === now.getTime());

    // Calcular la validez de los índices buscados
    const currValidIndex = currIndex >= 0 && currIndex < hours.length;
    const prevValidIndex = currValidIndex && currIndex - 1 >= 0;
    const nextValidIndex = currValidIndex && currIndex + 1 < hours.length;

    // Extraer datos de 15 minutos (últimos 4 slots = 1 hora)
    const rain15minArray = Array.from(minutely15.variables(1)!.valuesArray());
    const precipitation15minArray = Array.from(minutely15.variables(3)!.valuesArray());

    // Devolver los datos extraídos de la API
    return {
      temperature_2m: current.variables(0)!.value(),
      relative_humidity_2m: current.variables(3)!.value(),
      cloud_cover: current.variables(2)!.value(),
      wind_speed_10m: current.variables(4)!.value(),
      wind_direction_10m: current.variables(5)!.value(),
      wind_gusts_10m: current.variables(6)!.value(),
      rain: current.variables(7)!.value(),
      showers: current.variables(8)!.value(),
      precip_probability_prev: prevValidIndex ? hourly.variables(0)!.valuesArray()[currIndex - 1] : -1,
      precip_probability_curr: currValidIndex ? hourly.variables(0)!.valuesArray()[currIndex] : -1,
      precip_probability_next: nextValidIndex ? hourly.variables(0)!.valuesArray()[currIndex + 1] : -1,
      precip_intensity_prev: prevValidIndex ? hourly.variables(1)!.valuesArray()[currIndex - 1] : -1.0,
      rain_15min: rain15minArray,
      precipitation_15min: precipitation15minArray,
    };
  }

  /**
   * Updates weather data for a specific geohash location.
   *
   * Fetches raw weather data from the Open-Meteo API, transforms it into a persisted DTO format,
   * retrieves the previous surface water value from the database, transforms the raw data into
   * analysis format, processes it through the analysis service to update court states, and finally
   * creates a new weather entry in the database.
   *
   * @param geohash - Geohash string identifying the location to update weather for.
   * @returns Promise that resolves to the created WeatherDataDto.
   * @throws {InternalServerErrorException} When API fetch fails or database operations fail.
   */
  private async updateWeather(geohash: string): Promise<ResponseWeatherDataDto> {
    try {
      // Obtener todos los datos crudos del API en una sola llamada
      const rawWeather = await this.fetchWeather(geohash);

      // Transformar a WeatherDataDto para persistencia
      const weatherDto = this.toWeatherDataDto(rawWeather);

      // Obtener la cantidad de agua en superficie previa para el procesamiento de datos
      const weather = await this.prisma.weather.findFirst({
        where: { geohash },
        orderBy: { created_at: 'desc' },
        select: {
          surface_water_prev: true,
          alert_level: true,
          alert_level_ticks: true,
        },
      });

      // Transformar a WeatherData y actualizar la cantidad de agua en superficie previa
      const weatherData = this.toWeatherData(rawWeather);
      weatherData.surfaceWaterPrev = weather?.surface_water_prev ?? 0;
      weatherData.alertLevelPrev = weather?.alert_level ?? 0;
      weatherData.alertLevelTicksPrev = weather?.alert_level_ticks ?? 0;

      // Procesar los datos en el módulo de análisis para actualizar el estado de las pistas
      const weatherResult = await this.analysisService.processWeatherData(weatherData);

      // Crear la nueva entrada en la BD
      await this.prisma.weather.create({
        data: {
          geohash,
          ...weatherDto,
          surface_water_prev: weatherResult.surfaceWater,
          estimated_drying_time: weatherResult.estimatedDryingTime,
          alert_level: weatherResult.alertLevel,
          alert_level_ticks: weatherResult.alertLevelTicks,
        },
      });

      return new ResponseWeatherDataDto({
        ...weatherDto,
        estimated_drying_time: weatherResult.estimatedDryingTime,
        alert_level: weatherResult.alertLevel,
      });
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
        is_delete: false,
      },
      select: {
        loc_latitude: true,
        loc_longitude: true,
      },
    });

    // Si no hay complejos, finalizar la ejecución
    if (activeComplexes.length === 0) return;

    // Generar geohashes únicos (Precisión 5 = ~4.9km x 4.9km)
    const geohashes = new Set<string>(
      activeComplexes.map((complex) => ngeohash.encode(complex.loc_latitude, complex.loc_longitude, 5)),
    );

    // Procesar los geohashes para obtener los datos de la API y actualizar la BD
    for (const geohash of geohashes) await this.updateWeather(geohash);
  }

  /**
   * Purges expired weather data from the database.
   * Deletes all weather records older than 7 days, keeping only recent weather history.
   *
   * @throws {InternalServerErrorException} When the database deletion fails.
   */
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

  /**
   * Lifecycle hook called after the module is initialized.
   * Purges expired weather data and performs the initial weather update for active complexes.
   */
  async onModuleInit() {
    await this.purgeWeatherLogic();
    await this.updateWeatherLogic();
  }

  /**
   * Scheduled task that updates weather data every 20 minutes.
   */
  @Cron('0 */20 * * * *')
  async handleWeatherUpdate() {
    await this.updateWeatherLogic();
  }

  /**
   * Scheduled task that purges expired weather data daily at 4:00 AM UTC.
   */
  @Cron('0 0 4 * * *')
  async handleWeatherPurge() {
    await this.purgeWeatherLogic();
  }

  /**
   * Retrieves weather data for a specific geohash location.
   *
   * Attempts to fetch the most recent weather record from the database. If found, returns it immediately.
   * If not found, checks if an update is already in progress. If an update is already running, returns
   * the existing promise to avoid duplicate requests. If no update is in progress, initiates a new one
   * and caches the promise in activeRequests to handle concurrent requests efficiently.
   *
   * @param geohash - Geohash string identifying the location to retrieve weather for.
   * @returns Promise that resolves to the ResponseWeatherDataDto for the specified location.
   * @throws {InternalServerErrorException} When weather data cannot be fetched or created.
   */
  async getWeatherFromGeohash(geohash: string): Promise<ResponseWeatherDataDto> {
    // Obtener la información meteorológica almacenada en la BD
    const weather = await this.prisma.weather.findFirst({
      where: { geohash },
      orderBy: { created_at: 'desc' },
      select: {
        temperature_curr: true,
        relative_humidity_curr: true,
        cloud_cover_curr: true,
        wind_speed_curr: true,
        wind_direction_curr: true,
        precip_intensity_curr: true,
        precip_probability_curr: true,
        precip_probability_next: true,
        alert_level: true,
        estimated_drying_time: true,
      },
    });

    // Si se ha obtenido una entrada, devolver los datos
    if (weather !== null) return new ResponseWeatherDataDto(weather);

    // Si no se ha obtenido ninguna entrada, verificar si ya hay un proceso de actualización
    if (this.activeRequests.has(geohash)) return this.activeRequests.get(geohash)!;

    // Si no hay ningún proceso de actualización, iniciarlo (en este caso no hay bloqueo porque no hay await)
    const weatherUpdate = this.updateWeather(geohash).finally(() => {
      // Eliminar la entrada para el geohash actual
      this.activeRequests.delete(geohash);
    });

    // Crear la entrada para el geohash actual
    this.activeRequests.set(geohash, weatherUpdate);

    return weatherUpdate;
  }

  async getWeatherFromCoordinates(locLatitude: number, locLongitude: number): Promise<ResponseWeatherDataDto> {
    // Obtener el geohash de las coordenadas del complejo
    const geohash = ngeohash.encode(locLatitude, locLongitude, 5);
    // Obtener los datos meteorológicos del complejo
    return this.getWeatherFromGeohash(geohash);
  }

  /**
   * Retrieves weather information for a specific complex.
   *
   * Loads the complex by its id, encodes its latitude and longitude into a geohash with precision 5 (~4.9km accuracy),
   * fetches weather data for that geohash, and returns a DTO containing the complex id and the retrieved weather.
   *
   * @param complexId - The identifier of the complex to retrieve weather for.
   * @returns A Promise that resolves to a ResponseComplexWeatherDto containing the complex id and weather data.
   * @throws {Error} If the complex cannot be found or if the weather retrieval fails.
   */
  async getWeatherFromId(complexId: number): Promise<ResponseWeatherDataDto> {
    // Obtener los datos del complejo pedido
    const complex = await this.prisma.complexes.findUnique({ where: { id: complexId } });

    // Obtener los datos meteorológicos del complejo
    const weather = await this.getWeatherFromCoordinates(complex.loc_latitude, complex.loc_longitude);

    return new ResponseWeatherDataDto(weather);
  }
}
