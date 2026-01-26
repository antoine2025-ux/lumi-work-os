import { PrismaClient } from "@prisma/client";

/**
 * Central Prisma client export.
 * This file exists as a compatibility layer for org imports.
 * Schema is source of truth.
 */

export const prisma =
  (globalThis as any).__prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  (globalThis as any).__prisma = prisma;
}
