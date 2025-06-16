import { Injectable /*, OnModuleInit*/ } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService extends PrismaClient /* implements OnModuleInit */ {
  constructor(config: ConfigService) {
    super({
      datasources: {
        db: {
          url: config.get('DATABASE_URL') as string,
        },
      },
    });
  }

  // async onModuleInit() {
  //   await this.$connect();
  // }

  cleanDb() {
    return this.$transaction([
      this.reservations.deleteMany(),
      this.notifications.deleteMany(),
      this.admins.deleteMany(),
      this.users.deleteMany(),
      this.courts_status.deleteMany(),
      this.courts_devices.deleteMany(),
      this.courts.deleteMany(),
      this.device_telemetry.deleteMany(),
      this.devices.deleteMany(),
      this.system.deleteMany(),
    ]);
  }
}
