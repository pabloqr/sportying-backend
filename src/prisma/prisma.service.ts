import { Injectable /*, OnModuleInit*/ } from '@nestjs/common';
import { PrismaClient } from 'generated/prisma/client';
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
}
