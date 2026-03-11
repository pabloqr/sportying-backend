import { PrismaService } from '../../src/prisma/prisma.service';

const TABLES = [
  'admins',
  'courts_devices',
  'devices_telemetry',
  'devices',
  'courts_status',
  'notifications',
  'reservations',
  'courts',
  'complexes',
  'users',
  'weather',
  'sports',
];

export async function resetDatabase(prisma: PrismaService): Promise<void> {
  await prisma.$transaction([
    prisma.$executeRawUnsafe(
      `TRUNCATE TABLE ${TABLES.map((table) => `"${table}"`).join(', ')} RESTART IDENTITY CASCADE;`,
    ),
  ]);
}
