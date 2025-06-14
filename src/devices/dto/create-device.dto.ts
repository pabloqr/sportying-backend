import { DeviceType } from '../schemas/device.schema';

export class CreateDeviceDto {
  readonly id: number;
  readonly type: DeviceType;

  constructor(params: CreateDeviceDto) {
    Object.assign(this, params);
  }
}
