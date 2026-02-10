import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const connectionString = `${process.env.DATABASE_URL}`
const adapter = new PrismaPg({connectionString})
export function getPrisma() {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;

  const client = new PrismaClient({
    adapter,
    log: ["error", "warn"],
  });

  if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = client;
  return client;
}