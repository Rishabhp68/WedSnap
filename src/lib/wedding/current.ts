import { cache } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";

/**
 * The schema supports many weddings, but a given deployment serves exactly
 * one (set via WEDDING_SLUG). Every public/guest/admin route resolves "the"
 * wedding through this helper so swapping WEDDING_SLUG is the only change
 * needed to point the same codebase at a different couple's data.
 */
export const getCurrentWedding = cache(async () => {
  const slug = process.env.WEDDING_SLUG;
  if (!slug) {
    throw new Error("WEDDING_SLUG is not set. See .env.example.");
  }

  const wedding = await prisma.wedding.findUnique({
    where: { slug },
    include: { venue: true },
  });

  if (!wedding) {
    throw new Error(
      `No Wedding found for slug "${slug}". Did you run "npm run db:seed"?`,
    );
  }

  return wedding;
});

export type CurrentWedding = Awaited<ReturnType<typeof getCurrentWedding>>;

/** Same as getCurrentWedding, but renders Next's not-found UI instead of throwing. */
export async function getCurrentWeddingOrNotFound() {
  try {
    return await getCurrentWedding();
  } catch {
    notFound();
  }
}
