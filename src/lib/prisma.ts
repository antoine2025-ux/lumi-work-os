import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __loopwellPrisma: PrismaClient | undefined;
}

export const prisma =
  global.__loopwellPrisma ??
  new PrismaClient({
    log: ["error"],
  });

if (process.env.NODE_ENV !== "production") global.__loopwellPrisma = prisma;

