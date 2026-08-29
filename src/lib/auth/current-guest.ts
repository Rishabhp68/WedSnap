import { cache } from "react";
import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/client";
import { getCurrentWedding } from "@/lib/wedding/current";
import { ensureWeddingMembership, isBootstrapAdmin, syncUserFromClerk } from "./sync";

/**
 * Resolves the signed-in visitor's User + WeddingGuest for the wedding this
 * deployment serves. Returns null for a public visitor.
 *
 * The Clerk webhook (see app/api/webhooks/clerk) is the primary path that
 * creates the local User/WeddingGuest rows; this lazily creates them on
 * first authenticated request too, so the app keeps working even if the
 * webhook hasn't fired yet (e.g. local dev without a public URL).
 *
 * `cache()` dedupes this across every call within one request/render pass.
 */
export const getCurrentGuest = cache(async () => {
  const { userId: clerkId } = await auth();
  if (!clerkId) return null;

  let user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) {
    const clerkUser = await currentUser();
    if (!clerkUser) return null;
    user = await syncUserFromClerk(clerkUser);
  }

  const wedding = await getCurrentWedding();
  let guest = await prisma.weddingGuest.findUnique({
    where: { weddingId_userId: { weddingId: wedding.id, userId: user.id } },
  });
  if (!guest) {
    guest = await ensureWeddingMembership(user.id, clerkId);
  } else if (guest.role !== "ADMIN" && isBootstrapAdmin(clerkId)) {
    // Catches the ordinary case: the deployment's first admin signs up, reads
    // their id out of the Clerk dashboard, and only then sets
    // ADMIN_CLERK_IDS — by which point their guest row already exists. Without
    // this, the variable would silently do nothing and the only way in would
    // be editing the database by hand.
    guest = await prisma.weddingGuest.update({
      where: { id: guest.id },
      data: { role: "ADMIN" },
    });
  }

  return { user, guest, wedding };
});

export type CurrentGuest = NonNullable<Awaited<ReturnType<typeof getCurrentGuest>>>;

/** Use in Server Components/Actions that require a signed-in guest. */
export async function requireGuest(): Promise<CurrentGuest> {
  const result = await getCurrentGuest();
  if (!result) redirect("/sign-in");
  return result;
}

/** Use in Server Components/Actions that require the wedding admin role. */
export async function requireAdmin(): Promise<CurrentGuest> {
  const result = await requireGuest();
  if (result.guest.role !== "ADMIN") redirect("/app");
  return result;
}
