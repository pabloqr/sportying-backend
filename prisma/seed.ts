import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';
import { Pool } from 'pg';
import { Prisma, PrismaClient } from '../prisma/generated/client';

const connectionString = process.env.DATABASE_URL as string;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const sports: Prisma.sportsCreateInput[] = [
    {
      key: 'padel',
      // icon_name: 'sports_tennis',
      min_people: 2,
      max_people: 4,
    },
    {
      key: 'tennis',
      // icon_name: 'sports_tennis',
      min_people: 2,
      max_people: 4,
    },
    {
      key: 'football_5',
      // icon_name: 'sports_soccer',
      min_people: 10,
      max_people: 10,
    },
    {
      key: 'basketball',
      // icon_name: 'sports_basketball',
      min_people: 2,
      max_people: 10,
    },
    {
      key: 'volleyball',
      // icon_name: 'sports_volleyball',
      min_people: 10,
      max_people: 10,
    },
  ];

  for (const sport of sports) {
    const data = await prisma.sports.upsert({
      where: { key: sport.key },
      create: sport,
      update: {},
    });

    console.log({ data });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });
