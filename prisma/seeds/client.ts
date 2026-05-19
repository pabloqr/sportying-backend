import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/client.js';

const connectionString = process.env.DATABASE_URL as string;

if (!connectionString) {
  throw new Error('DATABASE_URL is required to seed the database.');
}

export const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });
