import { device_status, device_type, PrismaClient, user_role } from 'prisma/generated/client.js';

export const time = (value: string) => new Date(`1970-01-01T${value}:00.000Z`);

export async function upsertComplex(
  prisma: PrismaClient,
  data: {
    complexName: string;
    timeIni: string;
    timeEnd: string;
    locLatitude: number;
    locLongitude: number;
  },
) {
  return prisma.complexes.upsert({
    where: {
      loc_latitude_loc_longitude: {
        loc_latitude: data.locLatitude,
        loc_longitude: data.locLongitude,
      },
    },
    create: {
      complex_name: data.complexName,
      time_ini: time(data.timeIni),
      time_end: time(data.timeEnd),
      loc_latitude: data.locLatitude,
      loc_longitude: data.locLongitude,
    },
    update: {
      complex_name: data.complexName,
      time_ini: time(data.timeIni),
      time_end: time(data.timeEnd),
      is_delete: false,
      updated_at: new Date(),
    },
  });
}

export async function upsertUser(
  prisma: PrismaClient,
  data: {
    mail: string;
    password: string;
    role: user_role;
    name: string;
    surname: string;
    phonePrefix: number;
    phoneNumber: number;
    resetPassword?: boolean;
  },
) {
  return prisma.users.upsert({
    where: { mail: data.mail },
    create: {
      mail: data.mail,
      role: data.role,
      name: data.name,
      surname: data.surname,
      phone_prefix: data.phonePrefix,
      phone_number: data.phoneNumber,
      password: data.password,
    },
    update: {
      role: data.role,
      name: data.name,
      surname: data.surname,
      phone_prefix: data.phonePrefix,
      phone_number: data.phoneNumber,
      ...(data.resetPassword && { password: data.password }),
      is_delete: false,
      updated_at: new Date(),
    },
  });
}

export async function assignAdminToComplex(
  prisma: PrismaClient,
  data: {
    userId: number;
    complexId: number;
  },
) {
  return prisma.admins.upsert({
    where: {
      id_complex_id: {
        id: data.userId,
        complex_id: data.complexId,
      },
    },
    create: {
      id: data.userId,
      complex_id: data.complexId,
    },
    update: {
      is_delete: false,
      updated_at: new Date(),
    },
  });
}

export async function upsertCourt(
  prisma: PrismaClient,
  data: {
    complexId: number;
    number: number;
    sportKey: string;
    description: string;
    maxPeople: number;
  },
) {
  const stored = await prisma.courts.findFirst({
    where: {
      complex_id: data.complexId,
      number: data.number,
      sport_key: data.sportKey,
    },
  });

  const courtData = {
    complex_id: data.complexId,
    number: data.number,
    sport_key: data.sportKey,
    description: data.description,
    max_people: data.maxPeople,
    is_delete: false,
    updated_at: new Date(),
  };

  const court = stored
    ? await prisma.courts.update({
        where: { id: stored.id },
        data: courtData,
      })
    : await prisma.courts.create({ data: courtData });

  const status = await prisma.courts_status.findFirst({
    where: { court_id: court.id },
  });

  if (!status) {
    await prisma.courts_status.create({ data: { court_id: court.id } });
  }

  return court;
}

export async function upsertDevice(
  prisma: PrismaClient,
  data: {
    idKey: string;
    apiKey: string;
    complexId: number;
    type: device_type;
    status?: device_status;
  },
) {
  const status = data.status ?? device_status.NORMAL;

  return prisma.devices.upsert({
    where: { id_key: data.idKey },
    create: {
      id_key: data.idKey,
      api_key: data.apiKey,
      complex_id: data.complexId,
      type: data.type,
      status,
    },
    update: {
      api_key: data.apiKey,
      complex_id: data.complexId,
      type: data.type,
      status,
      is_delete: false,
      updated_at: new Date(),
    },
  });
}

export async function assignDeviceToCourt(
  prisma: PrismaClient,
  data: {
    courtId: number;
    deviceId: number;
  },
) {
  return prisma.courts_devices.upsert({
    where: {
      court_id_device_id: {
        court_id: data.courtId,
        device_id: data.deviceId,
      },
    },
    create: {
      court_id: data.courtId,
      device_id: data.deviceId,
    },
    update: { is_delete: false },
  });
}
