import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module.js';
import { JwtGuard, RolesGuard } from './auth/guard/index.js';
import { CommonModule } from './common/common.module.js';
import { ComplexesModule } from './complexes/complexes.module.js';
import { CourtsDevicesModule } from './courts-devices/court-devices.module.js';
import { CourtsStatusModule } from './courts-status/courts-status.module.js';
import { CourtsModule } from './courts/courts.module.js';
import { DevicesModule } from './devices/devices.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ReservationsStatusModule } from './reservations-status/reservations-status.module.js';
import { ReservationsModule } from './reservations/reservations.module.js';
import { SportsModule } from './sports/sports.module.js';
import { UsersModule } from './users/users.module.js';
import { WeatherModule } from './weather/weather.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    CommonModule,
    AuthModule,
    CourtsDevicesModule,
    DevicesModule,
    UsersModule,
    ComplexesModule,
    CourtsModule,
    ReservationsModule,
    NotificationsModule,
    WeatherModule,
    SportsModule,
    CourtsStatusModule,
    ReservationsStatusModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
