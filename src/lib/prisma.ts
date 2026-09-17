import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma';

const connectionString = process.env.DATABASE_URL || '';

const isLocalhost = Boolean(
  !connectionString ||
  connectionString.includes('localhost') ||
  connectionString.includes('127.0.0.1') ||
  connectionString.includes('sslmode=disable')
);

// Defensive SSL configuration: All remote non-localhost cloud PostgreSQL connections (Neon, Supabase, RDS, Railway, Render) require SSL
const needsSsl = !isLocalhost;

const prismaClientSingleton = () => {
  if (connectionString) {
    try {
      const pool = new Pool({
        connectionString,
        ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      });
      const adapter = new PrismaPg(pool);
      return new PrismaClient({ adapter });
    } catch (e) {
      console.warn('PrismaPg adapter initialization fallback:', e);
    }
  }
  return new PrismaClient();
};

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

globalThis.prismaGlobal = prisma;

export default prisma;
