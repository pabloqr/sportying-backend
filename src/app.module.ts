import { Module } from '@nestjs/common';
import { DevicesModule } from './devices/devices.module';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtGuard, RolesGuard } from './auth/guard';
import { UsersModule } from './users/users.module';
import { CommonModule } from './common/common.module';
import { ComplexesModule } from './complexes/complexes.module';
import { CourtsModule } from './courts/courts.module';
import { ReservationsModule } from './reservations/reservations.module';
import { NotificationsModule } from './notifications/notifications.module';
import { CourtsDevicesModule } from './courts-devices/court-devices.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
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
