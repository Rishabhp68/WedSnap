import "dotenv/config";
import { defineConfig, env } from "prisma/config";

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
  },
});
