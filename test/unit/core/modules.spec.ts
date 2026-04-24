import { MODULE_METADATA } from '@nestjs/common/constants.js';
import 'reflect-metadata';
import { AppModule } from '../../../src/app.module.js';
import { AuthModule } from '../../../src/auth/auth.module.js';
import { CommonModule } from '../../../src/common/common.module.js';
import { ComplexesModule } from '../../../src/complexes/complexes.module.js';
import { CourtsDevicesModule } from '../../../src/courts-devices/court-devices.module.js';
import { CourtsStatusModule } from '../../../src/courts-status/courts-status.module.js';
import { CourtsModule } from '../../../src/courts/courts.module.js';
import { DevicesModule } from '../../../src/devices/devices.module.js';
import { NotificationsModule } from '../../../src/notifications/notifications.module.js';
import { PrismaModule } from '../../../src/prisma/prisma.module.js';
import { ReservationsStatusModule } from '../../../src/reservations-status/reservations-status.module.js';
import { ReservationsModule } from '../../../src/reservations/reservations.module.js';
import { SportsModule } from '../../../src/sports/sports.module.js';
import { UsersModule } from '../../../src/users/users.module.js';
import { WeatherModule } from '../../../src/weather/weather.module.js';

//--------------------------------------------------------------------------------------------------------------------//
// Test suite
//--------------------------------------------------------------------------------------------------------------------//

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
