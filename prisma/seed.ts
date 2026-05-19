import { pool, prisma } from './seeds/client.js';
import { seedBaseData } from './seeds/base.js';

async function main() {
  await seedBaseData(prisma);

  if (process.env.NODE_ENV === 'development') {
    const { seedDevelopmentData } = await import('prisma/seeds/development.js');
    await seedDevelopmentData(prisma);
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
