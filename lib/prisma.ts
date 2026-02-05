import { PrismaClient } from '@prisma/client/extension';

const gloabForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma = 
	gloabForPrisma.prisma ?? 
	new PrismaClient({
		log: ["error","warn"]
	})

if (process.env.NODE_ENV !== "production") gloabForPrisma.prisma = prisma