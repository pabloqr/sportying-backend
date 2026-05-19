import * as argon from 'argon2';
import { device_type, PrismaClient, user_role } from '../generated/client.js';
import {
  assignAdminToComplex,
  assignDeviceToCourt,
  upsertComplex,
  upsertCourt,
  upsertDevice,
  upsertUser,
} from './core.js';

const demoPassword = '1234';
const demoRainDeviceSecret = 'dev-rain-device-secret';
const demoPresenceDeviceSecret = 'dev-presence-device-secret';

export async function seedDevelopmentData(prisma: PrismaClient) {
  const password = await argon.hash(demoPassword);
  const rainDeviceApiKey = await argon.hash(demoRainDeviceSecret);
  const presenceDeviceApiKey = await argon.hash(demoPresenceDeviceSecret);

  const complex = await upsertComplex(prisma, {
    complexName: 'Complejo Deportivo Bola de Oro',
    timeIni: '08:00',
    timeEnd: '23:00',
    locLatitude: 40.416775,
    locLongitude: -3.70379,
  });

  const superadmin = await upsertUser(prisma, {
    mail: 'superadmin@sportying.dev',
    password,
    role: user_role.SUPERADMIN,
    name: 'Superadmin',
    surname: 'Development',
    phonePrefix: 34,
    phoneNumber: 600000001,
    resetPassword: true,
  });

  const admin = await upsertUser(prisma, {
    mail: 'admin@sportying.dev',
    password,
    role: user_role.ADMIN,
    name: 'Admin',
    surname: 'Development',
    phonePrefix: 34,
    phoneNumber: 600000002,
    resetPassword: true,
  });

  const client = await upsertUser(prisma, {
    mail: 'client@gmail.com',
    password,
    role: user_role.CLIENT,
    name: 'Client',
    surname: 'Development',
    phonePrefix: 34,
    phoneNumber: 600000003,
    resetPassword: true,
  });

  await assignAdminToComplex(prisma, {
    userId: admin.id,
    complexId: complex.id,
  });

  const padelCourt = await upsertCourt(prisma, {
    complexId: complex.id,
    number: 1,
    sportKey: 'padel',
    description: 'Pista demo de padel cubierta',
    maxPeople: 4,
  });

  await upsertCourt(prisma, {
    complexId: complex.id,
    number: 2,
    sportKey: 'tennis',
    description: 'Pista demo de tenis exterior',
    maxPeople: 4,
  });

  const rainDevice = await upsertDevice(prisma, {
    idKey: '11111111-1111-4111-8111-111111111111',
    apiKey: rainDeviceApiKey,
    complexId: complex.id,
    type: device_type.RAIN,
  });

  const presenceDevice = await upsertDevice(prisma, {
    idKey: '22222222-2222-4222-8222-222222222222',
    apiKey: presenceDeviceApiKey,
    complexId: complex.id,
    type: device_type.PRESENCE,
  });

  await assignDeviceToCourt(prisma, {
    courtId: padelCourt.id,
    deviceId: rainDevice.id,
  });

  await assignDeviceToCourt(prisma, {
    courtId: padelCourt.id,
    deviceId: presenceDevice.id,
  });

  console.log({
    seeded: 'development',
    users: {
      superadmin: superadmin.mail,
      admin: admin.mail,
      client: client.mail,
    },
    apiKeys: '[REDACTED]',
  });
}
