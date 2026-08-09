import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

declare global {
  var __prisma: PrismaClient | undefined;
}

function createPrismaClient() {
  // Neon's pooled ("-pooler") connection string speaks plain Postgres wire
  // protocol over TCP, so the standard pg driver adapter works against it
  // directly — no proprietary driver needed. This also means the exact
  // same code works against any Postgres (local `prisma dev`, Docker, etc.)
  // for development.
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

// Reuse a single PrismaClient (and its connection pool) across hot reloads in
// dev, and across warm serverless function invocations in production — a
// fresh client per request would exhaust Neon's connection limit quickly at
// 400-500 concurrent guests.
export const prisma = globalThis.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}
