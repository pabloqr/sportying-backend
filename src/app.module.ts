import { Module } from '@nestjs/common';
import { DevicesModule } from './devices/devices.module';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    DevicesModule,
    AuthModule,
    PrismaModule,
  ],
})
export class AppModule {}
