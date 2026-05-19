import { Prisma, PrismaClient } from '../generated/client.js';

const sports: Prisma.sportsCreateInput[] = [
  {
    key: 'padel',
    min_people: 2,
    max_people: 4,
  },
  {
    key: 'tennis',
    min_people: 2,
    max_people: 4,
  },
  {
    key: 'football_5',
    min_people: 10,
    max_people: 10,
  },
  {
    key: 'basketball',
    min_people: 2,
    max_people: 10,
  },
  {
    key: 'volleyball',
    min_people: 10,
    max_people: 10,
  },
];

export async function seedBaseData(prisma: PrismaClient) {
  for (const sport of sports) {
    await prisma.sports.upsert({
      where: { key: sport.key },
      create: sport,
      update: {
        min_people: sport.min_people,
        max_people: sport.max_people,
        is_delete: false,
        updated_at: new Date(),
      },
    });
  }
}
