import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma';

const connectionString = process.env.DATABASE_URL || '';

const isLocalhost = Boolean(
  connectionString.includes('localhost') ||
  connectionString.includes('127.0.0.1') ||
  connectionString.includes('sslmode=disable')
);

// Defensive SSL configuration for cloud PostgreSQL connections (Neon, Supabase, Vercel Postgres, RDS)
const needsSsl = !isLocalhost && Boolean(
  connectionString.includes('sslmode=require') ||
  connectionString.includes('supabase') ||
  connectionString.includes('neon') ||
  connectionString.includes('vercel-storage') ||
  connectionString.includes('pooler')
);

const pool = new Pool({
  connectionString,
  ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

const adapter = new PrismaPg(pool);

const prismaClientSingleton = () => {
  return new PrismaClient({ adapter });
};

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

globalThis.prismaGlobal = prisma;

export default prisma;
