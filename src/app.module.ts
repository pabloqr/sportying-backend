import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { JwtGuard, RolesGuard } from './auth/guard';
import { CommonModule } from './common/common.module';
import { ComplexesModule } from './complexes/complexes.module';
import { CourtsDevicesModule } from './courts-devices/court-devices.module';
import { CourtsStatusModule } from './courts-status/courts-status.module';
import { CourtsModule } from './courts/courts.module';
import { DevicesModule } from './devices/devices.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PrismaModule } from './prisma/prisma.module';
import { ReservationsModule } from './reservations/reservations.module';
import { SportsModule } from './sports/sports.module';
import { UsersModule } from './users/users.module';
import { WeatherModule } from './weather/weather.module';
import { ReservationsStatusModule } from './reservations-status/reservations-status.module';

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
