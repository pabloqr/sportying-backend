import 'reflect-metadata';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { AppModule } from '../../../src/app.module';
import { AuthModule } from '../../../src/auth/auth.module';
import { CommonModule } from '../../../src/common/common.module';
import { ComplexesModule } from '../../../src/complexes/complexes.module';
import { CourtsDevicesModule } from '../../../src/courts-devices/court-devices.module';
import { CourtsStatusModule } from '../../../src/courts-status/courts-status.module';
import { CourtsModule } from '../../../src/courts/courts.module';
import { DevicesModule } from '../../../src/devices/devices.module';
import { NotificationsModule } from '../../../src/notifications/notifications.module';
import { PrismaModule } from '../../../src/prisma/prisma.module';
import { ReservationsModule } from '../../../src/reservations/reservations.module';
import { ReservationsStatusModule } from '../../../src/reservations-status/reservations-status.module';
import { SportsModule } from '../../../src/sports/sports.module';
import { UsersModule } from '../../../src/users/users.module';
import { WeatherModule } from '../../../src/weather/weather.module';

describe('Modules', () => {
  it('loads every application module definition', () => {
    expect(AppModule).toBeDefined();
    expect(AuthModule).toBeDefined();
    expect(CommonModule).toBeDefined();
    expect(ComplexesModule).toBeDefined();
    expect(CourtsDevicesModule).toBeDefined();
    expect(CourtsStatusModule).toBeDefined();
    expect(CourtsModule).toBeDefined();
    expect(DevicesModule).toBeDefined();
    expect(NotificationsModule).toBeDefined();
    expect(PrismaModule).toBeDefined();
    expect(ReservationsModule).toBeDefined();
    expect(ReservationsStatusModule).toBeDefined();
    expect(SportsModule).toBeDefined();
    expect(UsersModule).toBeDefined();
    expect(WeatherModule).toBeDefined();
  });

  it('registers application imports and guards in AppModule metadata', () => {
    const imports = Reflect.getMetadata(MODULE_METADATA.IMPORTS, AppModule);
    const providers = Reflect.getMetadata(MODULE_METADATA.PROVIDERS, AppModule);

    expect(imports).toHaveLength(16);
    expect(providers).toHaveLength(2);
  });
});
