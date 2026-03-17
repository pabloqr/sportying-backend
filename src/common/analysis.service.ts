import { Injectable } from '@nestjs/common';
import { CourtsStatusService } from 'src/courts-status/courts-status.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ReservationsStatusService } from 'src/reservations-status/reservations-status.service';
import { CourtStatus } from '../courts/enums';
import { NotificationsService } from '../notifications/notifications.service';
import { ReservationAvailabilityStatus } from '../reservations/enums';
import { DeviceTelemetrySlotDto } from './dto';
import { UtilitiesService } from './utilities.service';

export interface WeatherData {
  /**
   * Current air temperature at 2 meters above ground. Based on 15-minutely weather model data.
   */
  temperatureCurr: number;

  /**
   * Current relative humidity at 2 meters above ground. Based on 15-minutely weather model data.
   */
  relativeHumidityCurr: number;

  /**
   * Current total cloud cover as an area fraction. Based on 15-minutely weather model data.
   */
  cloudCoverCurr: number;

  /**
   * Wind speed at 10 meters above ground. Based on 15-minutely weather model data.
   */
  windSpeedCurr: number;

  /**
   * Gusts at 10 meters above ground as a maximum of the preceding hour. Based on 15-minutely weather model data.
   */
  windGustsCurr: number;

  /**
   * Current rain intensity. Based on 15-minutely weather model data.
   */
  rainCurr: number;

  /**
   *
   * Current showers intensity. Based on 15-minutely weather model data.
   *
   */
  showersCurr: number;

  /**
   * Rainfall intensity at 15-minute intervals for the hour before and after the current time.
   */
  rain15Min: number[];

  /**
   * Precipitation intensity at 15-minute intervals for the hour before and after the current time. Represents the sum
   * of the intensity of rain, showers and snow.
   */
  precipitation15Min: number[];

  /**
   * Previously calculated surface water.
   */
  surfaceWaterPrev: number;

  /**
   * Precipitation probability for the next hour (0–100). Used for alert level 1 evaluation.
   */
  precipitationProbabilityNext: number;

  /**
   * Alert level persisted in the previous cycle, after hysteresis was applied (0, 1 or 2).
   */
  alertLevelPrev: number;

  /**
   * Number of consecutive cycles in which the raw calculated level was lower than prevAlertLevel.
   */
  alertLevelTicksPrev: number;
}

export interface ResponseWeatherData {
  /**
   * Calculated surface water.
   */
  surfaceWater: number;

  /**
   * Calculated estimated drying time.
   */
  estimatedDryingTime: number;

  /**
   * Alert level after hysteresis (0, 1 or 2). Must be persisted as alert_level.
   */
  alertLevel: number;

  /**
   * Updated hysteresis tick counter. Must be persisted as alert_level_ticks.
   */
  alertLevelTicks: number;
}

const clamp = (num: number, min: number, max: number) => Math.min(Math.max(num, min), max);

@Injectable({})
export class AnalysisService {
  constructor(
    private prisma: PrismaService,
    private utilitiesService: UtilitiesService,
    private courtsStatusService: CourtsStatusService,
    private reservationsStatusService: ReservationsStatusService,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * Calculates a drying rate factor based on relative humidity.
   * Lower humidity values produce higher factors (faster drying), with a minimum floor.
   *
   * @param relativeHumidity - Relative humidity as a percentage (0-100).
   * @returns A factor between 0.15 and 1.0 affecting drying rate.
   */
  private calculateHumidityFactor(relativeHumidity: number): number {
    // Parámetros:
    // Peso de la humedad relativa sobre la tasa de secado
    const wHumidity = 0.7;
    // Factor mínimo por humedad
    const fHumidityMin = 0.15;

    return clamp(Math.pow(1 - relativeHumidity / 100, wHumidity), fHumidityMin, 1);
  }

  /**
   * Calculates a drying rate factor based on temperature.
   * Uses hyperbolic tangent to model temperature effects on drying rate.
   *
   * @param temperature - Air temperature in degrees Celsius.
   * @returns A factor multiplying the base drying rate.
   */
  private calculateTemperatureFactor(temperature: number): number {
    // Parámetros:
    // Peso de la temperatura sobre la tasa de secado --> [0.3, 0.6]
    const wTemperature = 0.45;
    // Temperatura límite para hacer que el secado comience a ser efectivo (ºC) --> [10, 18]
    const temperatureThreshold = 15;
    // Escala para controlar la suavidad de la función --> [5, 15]
    const temperatureScale = 10;
    // Valor de saturación por agua superficial (mm)
    const surfaceWaterSaturation = 2;

    return (
      1 +
      wTemperature *
        Math.tanh((temperature - temperatureThreshold) / temperatureScale) *
        (1 - Math.min(1, temperature / surfaceWaterSaturation))
    );
  }

  /**
   * Calculates a drying rate factor based on wind speed and gusts.
   * Combines sustained wind and gust values logarithmically.
   *
   * @param windSpeed - Sustained wind speed at 10 meters in km/h.
   * @param windGusts - Maximum wind gusts in km/h.
   * @returns A factor multiplying the base drying rate.
   */
  private calculateWindFactor(windSpeed: number, windGusts: number): number {
    // Parámetros:
    // Peso de las ráfagas --> [0.2, 0.4]
    const wGusts = 0.3;
    // Peso del viento sobre la tasa de secado --> [0.3, 0.8]
    const wWind = 0.6;
    // Intensidad del viento límite para hacer que el secado comience a ser efectivo (km/h)
    const windThreshold = 25;

    // Calcular la intensidad efectiva del viento teniendo en cuenta las ráfagas
    const windIntensity = windSpeed + wGusts * (windGusts - windSpeed);

    return 1 + wWind * (Math.log(1 + windIntensity) / Math.log(1 + windThreshold));
  }

  /**
   * Calculates a drying rate factor based on cloud cover.
   * Clear skies produce maximum factor, complete cloud cover produces factor of 1.0.
   *
   * @param cloudCover - Cloud cover as a fraction (0.0 = clear, 1.0 = fully cloudy).
   * @returns A factor between 1.0 and 1.2 affecting drying rate.
   */
  private calculateCloudCoverFactor(cloudCover: number): number {
    // Parámetros:
    // Peso de la nubosidad sobre la tasa de secado --> [0.1, 0.3]
    const wCloudCover = 0.2;

    return 1 + wCloudCover * (1 - cloudCover);
  }

  /**
   * Calculates the raw meteorological alert level (0, 1 or 2) based on current surface conditions,
   * then applies hysteresis to avoid level flapping between cycles.
   *
   * Alert level rules (evaluated in order of priority):
   *   2 (Danger)   — active rain OR critical surface water OR high estimated drying time.
   *   1 (Caution)  — recent accumulated precipitation OR short drying time remaining OR high next-hour rain probability.
   *   0 (None)     — all other conditions.
   *
   * Hysteresis rule (descending only):
   *   - Rising (rawLevel > prevAlertLevel): applied immediately; ticks reset to 0.
   *   - Equal  (rawLevel === prevAlertLevel): level unchanged; ticks reset to 0.
   *   - Falling (rawLevel < prevAlertLevel): tick counter incremented; level only drops when ticks reach 2.
   *
   * @param intensity             - Effective rain intensity in the current 15-min interval (mm/15 min).
   * @param intensitySum          - Accumulated effective precipitation over the last 60 minutes (mm).
   * @param surfaceWater          - Calculated surface water for this cycle (mm).
   * @param tEstimated            - Estimated drying time (min).
   * @param precipitationProbNext - Precipitation probability for the next hour (%).
   * @param alertLevelPrev        - Alert level persisted from the previous cycle (after hysteresis).
   * @param alertLevelTicksPrev   - Tick counter persisted from the previous cycle.
   * @returns Object containing the final alert level and the updated tick counter to persist.
   */
  private calculateAlertLevel(
    intensity: number,
    intensitySum: number,
    surfaceWater: number,
    tEstimated: number,
    precipitationProbNext: number,
    alertLevelPrev: number,
    alertLevelTicksPrev: number,
  ): { alertLevel: number; alertLevelTicks: number } {
    // Parámetros:
    // Intensidad límite para establecer bloqueo (mm/15 min)
    const intensityThreshold = 0.05;
    // Intensidad límite para establecer bloqueo (mm/60 min)
    const intensitySumThreshold = 0.1;
    // Probabilidad de lluvia próxima hora mínima para alerta 1 (%)
    const precipProbThreshold = 60;
    // Cantidad de agua en superficie límite para un nivel crítico (mm)
    const surfaceWaterCritical = 0.35;
    // Tiempo estimado corto (min) --> alerta 1
    const tEstimatedLow = 30;
    // Tiempo estimado alto (min) --> alerta 2
    const tEstimatedHigh = 60;
    // Ciclos consecutivos necesarios para cambiar el nivel de alerta
    const ticksThreshold = 2;

    // Calcular el nivel de alerta base
    let rawAlertLevel: number;
    if (intensity >= intensityThreshold || surfaceWater >= surfaceWaterCritical || tEstimated >= tEstimatedHigh) {
      rawAlertLevel = 2;
    } else if (
      intensitySum >= intensitySumThreshold ||
      (tEstimated > 0 && tEstimated <= tEstimatedLow) ||
      precipitationProbNext >= precipProbThreshold
    ) {
      rawAlertLevel = 1;
    } else {
      rawAlertLevel = 0;
    }

    // Aplicar histéresis
    if (rawAlertLevel >= alertLevelPrev) {
      // Subida inmediata o mantenimiento: resetear ticks
      return { alertLevel: rawAlertLevel, alertLevelTicks: 0 };
    }

    // Bajada potencial: incrementar ticks
    const newTicks = alertLevelTicksPrev + 1;
    if (newTicks >= ticksThreshold) {
      // Si se han cumplido los ciclos necesarios, aplicar descenso
      return { alertLevel: rawAlertLevel, alertLevelTicks: 0 };
    }

    // Aún no se han cumplido los ciclos: mantener nivel anterior
    return { alertLevel: alertLevelPrev, alertLevelTicks: newTicks };
  }

  /**
   * Processes weather data to calculate court closure duration due to moisture and precipitation.
   *
   * Implements a sophisticated weather analysis algorithm that:
   * 1. Checks if current rain/shower intensity exceeds immediate closure threshold
   * 2. If not, evaluates precipitation accumulated over the past hour
   * 3. If accumulated precipitation exceeds threshold, calculates blocking durations:
   *    - tLock: Safety lock preventing re-opening due to recent rain
   *    - tDry: Physical drying time based on weather conditions and accumulated water
   * 4. Takes maximum of both durations and clamps to [tMin, tMax] range
   *
   * Drying rate uses four environmental factors: humidity, temperature, wind, and cloud cover.
   *
   * @param weather - WeatherData object containing current and historical weather measurements.
   * @returns Promise that resolves once the calculation is complete.
   * @note The calculated blocking time is currently computed but not persisted in this implementation.
   */
  async processWeatherData(weather: WeatherData): Promise<ResponseWeatherData> {
    // Parámetros generales:
    // Tiempo mínimo de bloqueo (min)
    const tMin = 20;
    // Tiempo máximo de bloqueo (min)
    const tMax = 240;
    // Intensidad límite para establecer bloqueo (mm/15 min)
    const intensityThreshold = 0.05;
    // Intensidad límite para establecer bloqueo (mm/60 min)
    const intensitySumThreshold = 0.1;

    // PASO 1: Verificar si la intensidad actual supera el límite para establecer un bloqueo
    // Parámetros:
    // Peso de 'showers' --> [1.2, 2.0]
    const wShowers = 1.6;

    const intensity = weather.rainCurr + wShowers * weather.showersCurr;
    if (intensity >= intensityThreshold) {
      const { alertLevel, alertLevelTicks } = this.calculateAlertLevel(
        intensity,
        0,
        0,
        0,
        weather.precipitationProbabilityNext,
        weather.alertLevelPrev,
        weather.alertLevelTicksPrev,
      );

      return { surfaceWater: 0.0, estimatedDryingTime: 0, alertLevel, alertLevelTicks };
    } else {
      // PASO 2.1: Calcular la intensidad efectiva del agua en función de los bloques de 15 minutos dados
      const intensityArray = weather.rain15Min.slice(0, 4).map((r, i) => {
        // Obtener la intensidad por 'precipitation'
        const p = weather.precipitation15Min[i];
        // Calcular la intensidad efectiva para el bloque actual
        return r + wShowers * (p - r);
      });

      // PASO 2.2: Calcular la suma total de la intensidad efectiva del agua durante última hora
      const intensitySum = intensityArray.reduce((sum, intensity) => sum + intensity, 0);

      // PASO 3: Si no se supera el límite para establecer un bloqueo inicial (no está lloviendo), se verifica si la
      // suma total de la última hora supera el límite para establecer un bloqueo
      if (intensitySum < intensitySumThreshold) {
        const { alertLevel, alertLevelTicks } = this.calculateAlertLevel(
          intensity,
          intensitySum,
          0,
          0,
          weather.precipitationProbabilityNext,
          weather.alertLevelPrev,
          weather.alertLevelTicksPrev,
        );

        return { surfaceWater: 0.0, estimatedDryingTime: 0, alertLevel, alertLevelTicks };
      } else {
        // PASO 4: Si se supera el límite para establecer un bloqueo por acumulación de agua, calcular:
        //  a. Bloqueo de seguridad (tLock)
        //  b. Bloqueo por condiciones físicas (tDry)

        // PASO 4a: Calcular el bloqueo de seguridad que previene reaperturas por lluvia reciente
        // Parámetros:
        // Minutos necesarios para que se seque un milímetro de agua acumulada (min/mm) --> [40, 70]
        const dryingTimePerMm = 50;

        const tLock = tMin + dryingTimePerMm * intensitySum;

        // PASO 4b: Calcular el bloqueo físico, para ello, necesitamos calcular la tasa de secado efectiva
        // Parámetros:
        // Tasa base de secado por hora (mm/h) --> [0.6, 1.2]
        const dryinRateBase = 0.9;
        // Tasa mínima de secado por hora (mm/h)
        const dryinRateMin = 0.15;
        // Tasa máxima de secado por hora (mm/h)
        const dryinRateMax = 2.5;

        // PASO 4b.1: Calcular el factor por humedad relativa con saturación
        const fHumidity = this.calculateHumidityFactor(weather.relativeHumidityCurr);

        // PASO 4b.2: Calcular el factor por temperatura con saturación
        const fTemperature = this.calculateTemperatureFactor(weather.temperatureCurr);

        // PASO 4b.3: Calcular el factor por viento (incluyendo ráfagas) con saturación
        const fWind = this.calculateWindFactor(weather.windSpeedCurr, weather.windGustsCurr);

        // PASO 4b.4: Calcular el factor por nubosidad con saturación
        const fCloudCover = this.calculateCloudCoverFactor(weather.cloudCoverCurr);

        // PASO 4b.5: Calcular la tasa de secado a partir de los factores por humedad, temperatura, viento y nubosidad
        const dryinRate = clamp(
          dryinRateBase * fHumidity * fTemperature * fWind * fCloudCover,
          dryinRateMin,
          dryinRateMax,
        );

        // PASO 4b.6: Calcular la cantidad de agua en superficie
        // Parámetros:
        // Peso del drenaje de la pista --> [0.6, 0.95]
        const wDrain = 0.85;
        // Agua máxima en superficie (mm) --> [3, 6]
        const surfaceWaterMax = 6.0;

        const surfaceWater = clamp(
          wDrain * weather.surfaceWaterPrev + intensityArray.at(-2) + intensity - dryinRate * 0.5,
          0,
          surfaceWaterMax,
        );

        // PASO 4b.7: Calcular el bloqueo por condiciones físicas
        // Parámetros:
        // Cantidad de agua en superficie límite para establecer un bloqueo (mm) --> [0.05, 0.15]
        const surfaceWaterThreshold = 0.1;

        const tDry = Math.max(0, ((surfaceWater - surfaceWaterThreshold) / dryinRate) * 60);

        // PASO 5: Calcular el tiempo estimado para el secado tomando el mayor de los dos bloqueos calculados
        const tEstimated = clamp(Math.max(tLock, tDry), tMin, tMax);

        const { alertLevel, alertLevelTicks } = this.calculateAlertLevel(
          intensity,
          intensitySum,
          surfaceWater,
          tEstimated,
          weather.precipitationProbabilityNext,
          weather.alertLevelPrev,
          weather.alertLevelTicksPrev,
        );

        return { surfaceWater, estimatedDryingTime: tEstimated, alertLevel, alertLevelTicks };
      }
    }
  }

  /**
   * Processes availability telemetry for a specified court and updates reservation statuses accordingly.
   *
   * @param {boolean} available - Indicates whether the court is currently available or not.
   * @param {Date} timestamp - The timestamp of the availability telemetry.
   * @param {number} courtId - The unique identifier of the court for which telemetry is being processed.
   * @return {Promise<void>} - A promise that resolves once the operation is completed.
   */
  async processAvailabilityTelemetry(available: boolean, timestamp: Date, courtId: number): Promise<void> {
    const reservations = await this.prisma.reservations.findMany({
      where: { court_id: courtId },
    });

    const current = reservations.find((reservation) =>
      this.utilitiesService.dateIsBetween(timestamp, reservation.date_ini, reservation.date_end),
    );

    if (!current) return;

    let reservationStatus = ReservationAvailabilityStatus.OCCUPIED;
    if (available) {
      if (!this.utilitiesService.dateIsEqualOrGreater(15, current.date_ini, timestamp)) {
        return;
      }

      reservationStatus = ReservationAvailabilityStatus.CANCELLED;
    }

    await this.reservationsStatusService.setReservationStatus(current.id, reservationStatus);

    this.notificationsService.notifyReservationChange(current.complex_id, current.id, reservationStatus);
  }

  /**
   * Processes rain telemetry data to update the status of courts and send notifications
   * based on current and previous rain intensity.
   *
   * @param {number} complexId - The identifier for the complex containing the courts.
   * @param {number} previousTelemetry - The rain intensity recorded previously.
   * @param {number} rainIntensity - The current rain intensity.
   * @param {number[]} courtIds - An array of identifiers for the courts within the complex.
   * @return {Promise<void>} A promise that resolves when the process is complete.
   */
  async processRainTelemetry(
    complexId: number,
    previousTelemetry: DeviceTelemetrySlotDto | null,
    rainIntensity: number,
    courtIds: number[],
  ): Promise<void> {
    for (const courtId of courtIds) {
      let courtStatus = CourtStatus.OPEN;
      if (rainIntensity >= 2.5 || (previousTelemetry && previousTelemetry.value > 0.0)) {
        courtStatus = CourtStatus.WEATHER;
      } else if (
        previousTelemetry &&
        (previousTelemetry.value == 0.0 ||
          (previousTelemetry.value <= 2.5 &&
            this.utilitiesService.dateIsEqualOrGreater(30, previousTelemetry.createdAt, new Date())))
      ) {
        courtStatus = CourtStatus.OPEN;
      }

      // Obtener el estatus actual de la pista para aplicar los cambios necesarios
      const statusData = (await this.courtsStatusService.getCourtStatus(complexId, courtId)).statusData;
      if (statusData.status !== courtStatus) {
        await this.courtsStatusService.setCourtStatus(complexId, courtId, {
          status: courtStatus,
        });

        this.notificationsService.notifyCourtStatusChange(complexId, courtId, courtStatus);
      }
    }
  }
}
