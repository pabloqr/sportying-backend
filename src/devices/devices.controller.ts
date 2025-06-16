import { Controller } from '@nestjs/common';
import { DevicesService } from './devices.service';

@Controller()
export class DevicesController {
  constructor(private devicesService: DevicesService) {}
}
