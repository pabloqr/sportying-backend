import { INestApplication, ValidationPipe } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { user_role } from 'prisma/generated/enums';
import { AppModule } from 'src/app.module';
import { Role } from 'src/auth/enums';
import { PrismaService } from 'src/prisma/prisma.service';
import { WeatherService } from 'src/weather/weather.service';

const TEST_MAIL_PREFIX = 'e2e_test_';
export const TEST_PHONE_PREFIX = 34;
const TEST_PHONE_NUMBER = 610000000;
let uniqueSequence = 0;

export const getUniqueMail = (suffix: string) =>
  `${TEST_MAIL_PREFIX}${suffix}_${Date.now()}_${uniqueSequence++}@test.com`;

export const getUniquePhoneNumber = () => {
  const base = Date.now() % 100000000;
  return TEST_PHONE_NUMBER + ((base + uniqueSequence++) % 90000000);
};

type WeatherServiceMockBase = {
  onModuleInit: () => Promise<void>;
  handleWeatherUpdate: () => Promise<void>;
  handleWeatherPurge: () => Promise<void>;
};

export const createWeatherServiceMock = <T extends Record<string, unknown>>(
  overrides: T = {} as T,
): WeatherServiceMockBase & T => ({
  onModuleInit: async () => undefined,
  handleWeatherUpdate: async () => undefined,
  handleWeatherPurge: async () => undefined,
  ...overrides,
});

export const createE2EApp = async (
  providerOverrides: Array<{ provide: any; useValue: any }> = [],
): Promise<{
  app: INestApplication;
  httpServer: any;
  prisma: PrismaService;
  jwtService: JwtService;
  moduleRef: TestingModule;
}> => {
  const overrides = [...providerOverrides];
  const weatherOverrideIndex = overrides.findIndex((override) => override.provide === WeatherService);

  if (weatherOverrideIndex >= 0) {
    overrides[weatherOverrideIndex] = {
      provide: WeatherService,
      useValue: createWeatherServiceMock(overrides[weatherOverrideIndex].useValue),
    };
  } else {
    overrides.push({
      provide: WeatherService,
      useValue: createWeatherServiceMock(),
    });
  }

  let builder = Test.createTestingModule({
    imports: [AppModule],
  });

  overrides.forEach(({ provide, useValue }) => {
    builder = builder.overrideProvider(provide).useValue(useValue);
  });

  const moduleRef = await builder.compile();
  const app = moduleRef.createNestApplication();

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  await app.init();

  return {
    app,
    httpServer: app.getHttpServer(),
    prisma: app.get(PrismaService),
    jwtService: app.get(JwtService),
    moduleRef,
  };
};

export const createUserRecord = async (
  prisma: PrismaService,
  createdUserIds: number[],
  role: Role = Role.CLIENT,
  data: Record<string, unknown> = {},
) => {
  const user = await prisma.users.create({
    data: {
      role: role as user_role,
      password: 'hashed',
      name: 'E2E',
      surname: 'User',
      mail: getUniqueMail(`user_${role.toLowerCase()}`),
      phone_prefix: TEST_PHONE_PREFIX,
      phone_number: getUniquePhoneNumber(),
      ...data,
    },
  });

  createdUserIds.push(user.id);
  return user;
};

export const createSportRecord = async (
  prisma: PrismaService,
  createdSportKeys: string[],
  data: Record<string, unknown> = {},
) => {
  const sportKey = `e2e_sport_${Date.now()}_${uniqueSequence++}`;
  const sport = await prisma.sports.create({
    data: {
      key: sportKey,
      min_people: 1,
      max_people: 2,
      ...data,
    },
  });

  createdSportKeys.push(sport.key);
  return sport;
};

export const createComplexRecord = async (
  prisma: PrismaService,
  createdComplexIds: number[],
  data: Record<string, unknown> = {},
) => {
  const offset = Date.now() + uniqueSequence++;
  const complex = await prisma.complexes.create({
    data: {
      complex_name: `E2E Complex ${Date.now()}_${offset}`,
      time_ini: new Date('1970-01-01T08:00:00.000Z'),
      time_end: new Date('1970-01-01T22:00:00.000Z'),
      loc_latitude: 40 + (offset % 1000000) / 10000000,
      loc_longitude: -3 - (offset % 1000000) / 10000000,
      ...data,
    },
  });

  createdComplexIds.push(complex.id);
  return complex;
};

export const createCourtRecord = async (
  prisma: PrismaService,
  createdCourtIds: number[],
  data: {
    complex_id: number;
    sport_key: string;
    number?: number;
    description?: string;
    max_people?: number;
  },
) => {
  const court = await prisma.courts.create({
    data: {
      complex_id: data.complex_id,
      sport_key: data.sport_key,
      number: data.number ?? 1000 + uniqueSequence++,
      description: data.description ?? 'E2E court',
      max_people: data.max_people ?? 2,
    },
  });

  createdCourtIds.push(court.id);
  return court;
};

export const createDeviceRecord = async (
  prisma: PrismaService,
  createdDeviceIds: number[],
  data: {
    complex_id: number;
    id_key?: string;
    api_key?: string;
    type?: 'RAIN' | 'PRESENCE';
    status?: 'NORMAL' | 'OFF' | 'BATTERY' | 'ERROR';
  },
) => {
  const device = await prisma.devices.create({
    data: {
      complex_id: data.complex_id,
      id_key: data.id_key ?? randomUUID(),
      api_key: data.api_key ?? 'hashed-secret',
      type: data.type ?? 'RAIN',
      status: data.status ?? 'NORMAL',
    },
  });

  createdDeviceIds.push(device.id);
  return device;
};

export const createAuthHeader = async (
  prisma: PrismaService,
  jwtService: JwtService,
  createdUserIds: number[],
  role: Role = Role.SUPERADMIN,
  data: Record<string, unknown> = {},
) => {
  const user = await createUserRecord(prisma, createdUserIds, role, data);
  const accessToken = await jwtService.signAsync(
    {
      sub: user.id,
      mail: user.mail,
      role,
    },
    {
      secret: process.env.JWT_SECRET,
      expiresIn: '15m',
    },
  );

  return {
    user,
    authHeader: `Bearer ${accessToken}`,
  };
};

export const signAuthHeader = async (
  jwtService: JwtService,
  user: { id: number; mail: string; role: user_role | Role },
) => {
  const accessToken = await jwtService.signAsync(
    {
      sub: user.id,
      mail: user.mail,
      role: user.role,
    },
    {
      secret: process.env.JWT_SECRET,
      expiresIn: '15m',
    },
  );

  return `Bearer ${accessToken}`;
};

export const cleanupUsers = async (prisma: PrismaService, createdUserIds: number[]) => {
  const userIds = createdUserIds.filter((id): id is number => typeof id === 'number');

  if (userIds.length > 0) {
    await prisma.admins.deleteMany({ where: { id: { in: userIds } } });
    await prisma.users.deleteMany({ where: { id: { in: userIds } } });
    createdUserIds.length = 0;
  }
};

export const cleanupDevices = async (prisma: PrismaService, createdDeviceIds: number[]) => {
  const deviceIds = createdDeviceIds.filter((id): id is number => typeof id === 'number');

  if (deviceIds.length > 0) {
    await prisma.courts_devices.deleteMany({ where: { device_id: { in: deviceIds } } });
    await prisma.devices_telemetry.deleteMany({ where: { device_id: { in: deviceIds } } });
    await prisma.devices.deleteMany({ where: { id: { in: deviceIds } } });
    createdDeviceIds.length = 0;
  }
};

export const cleanupCourts = async (prisma: PrismaService, createdCourtIds: number[]) => {
  const courtIds = createdCourtIds.filter((id): id is number => typeof id === 'number');

  if (courtIds.length > 0) {
    await prisma.courts_devices.deleteMany({ where: { court_id: { in: courtIds } } });
    await prisma.courts_status.deleteMany({ where: { court_id: { in: courtIds } } });
    await prisma.reservations.deleteMany({ where: { court_id: { in: courtIds } } });
    await prisma.courts.deleteMany({ where: { id: { in: courtIds } } });
    createdCourtIds.length = 0;
  }
};

export const cleanupComplexes = async (prisma: PrismaService, createdComplexIds: number[]) => {
  const complexIds = createdComplexIds.filter((id): id is number => typeof id === 'number');

  if (complexIds.length > 0) {
    await prisma.admins.deleteMany({ where: { complex_id: { in: complexIds } } });
    await prisma.complexes.deleteMany({ where: { id: { in: complexIds } } });
    createdComplexIds.length = 0;
  }
};

export const cleanupSports = async (prisma: PrismaService, createdSportKeys: string[]) => {
  const sportKeys = createdSportKeys.filter((key): key is string => typeof key === 'string');

  if (sportKeys.length > 0) {
    await prisma.sports.deleteMany({ where: { key: { in: sportKeys } } });
    createdSportKeys.length = 0;
  }
};
