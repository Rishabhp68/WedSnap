import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Only `migrate dev` / `migrate diff` need a shadow database. Deploys run
// `migrate deploy`, which never uses one — so this stays optional rather than
// becoming a required variable that would break the Vercel build.
const shadowDatabaseUrl = process.env.SHADOW_DATABASE_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Migrations need a direct (unpooled) connection to Neon; the app itself
    // uses the pooled DATABASE_URL at runtime via lib/db/client.ts.
    url: env("DIRECT_URL"),
    // `prisma migrate dev` and `migrate diff --from-migrations` need a scratch
    // database to replay migrations into. Without it, `migrate dev` fails and
    // there's no way to check the migration history still reproduces the
    // schema — which is exactly what a fresh deploy replays.
    ...(shadowDatabaseUrl ? { shadowDatabaseUrl } : {}),
  },
});
