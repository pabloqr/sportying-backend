import * as argon from 'argon2';
import { Role } from '../../src/auth/enums';
import { CourtStatus } from '../../src/courts/enums';
import { PrismaService } from '../../src/prisma/prisma.service';
import { CreateReservationDto } from '../../src/reservations/dto';
import { user_role } from '../../prisma/generated/client';

export function buildSignupDto(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    name: 'Test',
    surname: 'User',
    mail: 'test@sportying.test',
    phonePrefix: 34,
    phoneNumber: 600000001,
    password: 'secret123',
    ...overrides,
  };
}

export function buildCreateUserDto(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    role: Role.CLIENT,
    name: 'Client',
    surname: 'User',
    mail: 'client@sportying.test',
    phonePrefix: 34,
    phoneNumber: 600000002,
    password: 'secret123',
    ...overrides,
  };
}

export function buildReservationDto(
  overrides: Partial<CreateReservationDto> = {},
): CreateReservationDto {
  const now = new Date();
  const dateIni = new Date(now);
  dateIni.setMinutes(0, 0, 0);

  if (dateIni.getHours() >= 21) {
    dateIni.setDate(dateIni.getDate() + 1);
    dateIni.setHours(10, 0, 0, 0);
  } else {
    dateIni.setHours(Math.max(10, dateIni.getHours() + 1), 0, 0, 0);
  }

  const dateEnd = new Date(dateIni);
  dateEnd.setHours(dateIni.getHours() + 1);

  return {
    userId: 1,
    courtId: 1,
    dateIni,
    dateEnd,
    ...overrides,
  };
}

export async function seedSport(prisma: PrismaService, key = 'padel') {
  return prisma.sports.create({
    data: {
      key,
      max_people: 4,
    },
  });
}

export async function seedComplex(
  prisma: PrismaService,
  overrides: Partial<{
    complex_name: string;
    time_ini: Date;
    time_end: Date;
    loc_latitude: number;
    loc_longitude: number;
  }> = {},
) {
  return prisma.complexes.create({
    data: {
      complex_name: 'Test Complex',
      time_ini: new Date(1970, 0, 1, 0, 0, 0),
      time_end: new Date(1970, 0, 1, 23, 59, 0),
      loc_latitude: 40.4168,
      loc_longitude: -3.7038,
      ...overrides,
    },
  });
}

export async function seedCourt(
  prisma: PrismaService,
  overrides: Partial<{
    complex_id: number;
    number: number;
    sport_key: string;
    description: string;
    max_people: number;
  }> = {},
) {
  const court = await prisma.courts.create({
    data: {
      complex_id: 1,
      number: 1,
      sport_key: 'padel',
      description: 'Court 1',
      max_people: 4,
      ...overrides,
    },
  });

  await prisma.courts_status.create({
    data: {
      court_id: court.id,
      status: CourtStatus.OPEN,
      alert_level: 0,
      estimated_drying_time: 0,
    },
  });

  return court;
}

export async function seedUser(
  prisma: PrismaService,
  overrides: Partial<{
    role: Role;
    name: string;
    surname: string | null;
    mail: string;
    phone_prefix: number;
    phone_number: number;
    password: string;
    refresh_token: string | null;
    is_delete: boolean;
  }> = {},
) {
  const password = overrides.password ?? 'secret123';
  const refreshToken = overrides.refresh_token ?? null;

  return prisma.users.create({
    data: {
      role: (overrides.role ?? Role.CLIENT) as user_role,
      name: overrides.name ?? 'Seeded',
      surname: overrides.surname ?? 'User',
      mail: overrides.mail ?? 'seeded@sportying.test',
      phone_prefix: overrides.phone_prefix ?? 34,
      phone_number: overrides.phone_number ?? 600000010,
      password: await argon.hash(password),
      refresh_token: refreshToken ? await argon.hash(refreshToken) : null,
      is_delete: overrides.is_delete ?? false,
    },
  });
}

export async function seedBaseCatalog(prisma: PrismaService) {
  const sport = await seedSport(prisma);
  const complex = await seedComplex(prisma);
  const court = await seedCourt(prisma, {
    complex_id: complex.id,
    sport_key: sport.key,
  });

  return { sport, complex, court };
}
