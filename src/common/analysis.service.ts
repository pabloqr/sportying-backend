import { Injectable } from '@nestjs/common';
import { CourtsService } from '../courts/courts.service';
import { DeviceType } from '../devices/enum';

@Injectable({})
export class AnalysisService {
  constructor(private courtsService: CourtsService) {}

  private async processAvailabilityTelemetry(
    deviceId: number,
    available: boolean,
    court: number,
  ): Promise<void> {}

  private async processRainTelemetry(
    deviceId: number,
    rainIntensity: number,
    courts: number[],
  ) {}

  async processDeviceTelemetry(
    deviceId: number,
    type: DeviceType,
    value: number,
    courts: number[],
  ): Promise<void> {
    if (!courts.length) return;

    switch (type) {
      case DeviceType.PRESENCE:
        await this.processAvailabilityTelemetry(deviceId, !!value, courts[0]);
        break;
      case DeviceType.RAIN:
        await this.processRainTelemetry(deviceId, value, courts);
        break;
    }
  }
}
