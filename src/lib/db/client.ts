import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

declare global {
  var __prisma: PrismaClient | undefined;
}

/**
 * Pool size per client instance.
 *
 * Defaults to 10, which suits a Neon serverless instance. Local `prisma dev`
 * is far tighter — its daemon advertises `connection_limit=10` as a hard
 * ceiling for *everything* connecting to it, so a 10-connection app pool
 * leaves nothing for Prisma Studio or a parallel `next build`, and the daemon
 * starts resetting connections (surfacing as Prisma error P1017,
 * "Server has closed the connection").
 *
 * Set DB_POOL_MAX lower when running against `prisma dev` alongside other
 * tools. See .env.example.
 */
function poolMax(): number {
  const configured = Number(process.env.DB_POOL_MAX);
  if (Number.isFinite(configured) && configured > 0) return configured;

  // `next build` forks roughly one worker per core, and each is a separate
  // process with its own client and its own pool — so the effective ceiling is
  // (workers x max), around 90 here. Prerendering is sequential inside a
  // worker, so a big pool buys nothing and just multiplies out until the local
  // daemon starts refusing connections mid-build.
  if (process.env.NEXT_PHASE === "phase-production-build") return 2;

  return 10;
}

function createPrismaClient() {
  // Neon's pooled ("-pooler") connection string speaks plain Postgres wire
  // protocol over TCP, so the standard pg driver adapter works against it
  // directly — no proprietary driver needed. This also means the exact
  // same code works against any Postgres (local `prisma dev`, Docker, etc.)
  // for development.
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
    max: poolMax(),
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
