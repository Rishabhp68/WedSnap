import { prisma } from "@/lib/db/client";
import { getCurrentWedding } from "@/lib/wedding/current";
import type { GuestRole } from "@/generated/prisma/client";

/**
 * Structural subset of Clerk's `User` we actually read. Defined locally
 * (rather than importing Clerk's type) so this module has no dependency on
 * where the caller got the user from — the webhook payload and
 * `currentUser()` both satisfy this shape.
 */
export interface ClerkUserLike {
  id: string;
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  primaryEmailAddress?: { emailAddress: string } | null;
  emailAddresses?: { emailAddress: string }[];
  imageUrl?: string | null;
}

function resolveName(user: ClerkUserLike): string {
  return (
    user.fullName?.trim() ||
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
    resolveEmail(user) ||
    "Guest"
  );
}

function resolveEmail(user: ClerkUserLike): string | null {
  return user.primaryEmailAddress?.emailAddress ?? user.emailAddresses?.[0]?.emailAddress ?? null;
}

/**
 * Whether ADMIN_CLERK_IDS names this Clerk user as a bootstrap admin.
 *
 * The point of the variable is to get the *first* admin into a fresh
 * deployment, where nobody has the access needed to promote anyone through
 * /admin. It's checked on every request rather than only at sign-up: a Clerk
 * user id isn't knowable until that person has signed up, so the id almost
 * always gets configured *after* their guest row already exists.
 */
export function isBootstrapAdmin(clerkId: string): boolean {
  return (process.env.ADMIN_CLERK_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .includes(clerkId);
}

/** Create or update the local User row that mirrors a Clerk identity. */
export async function syncUserFromClerk(clerkUser: ClerkUserLike) {
  const name = resolveName(clerkUser);
  const email = resolveEmail(clerkUser);

  return prisma.user.upsert({
    where: { clerkId: clerkUser.id },
    update: {
      name,
      email: email ?? undefined,
      avatarUrl: clerkUser.imageUrl ?? undefined,
    },
    create: {
      clerkId: clerkUser.id,
      name,
      email: email ?? undefined,
      avatarUrl: clerkUser.imageUrl ?? undefined,
    },
  });
}

/**
 * Every signed-in user is automatically a guest of the wedding this
 * deployment serves — the app has no invite-code flow, so signing in *is*
 * the invitation. Also drops the guest into the wedding-wide group chat so
 * they land somewhere with people already in it.
 */
export async function ensureWeddingMembership(userId: string, clerkId: string) {
  const wedding = await getCurrentWedding();

  const existing = await prisma.weddingGuest.findUnique({
    where: { weddingId_userId: { weddingId: wedding.id, userId } },
  });
  if (existing) return existing;

  const role: GuestRole = isBootstrapAdmin(clerkId) ? "ADMIN" : "GUEST";

  return prisma.$transaction(async (tx) => {
    const guest = await tx.weddingGuest.create({
      data: { weddingId: wedding.id, userId, role },
    });

    const groupRoom = await tx.chatRoom.findFirst({
      where: { weddingId: wedding.id, type: "GROUP" },
      select: { id: true },
    });
    if (groupRoom) {
      await tx.chatMember.upsert({
        where: { chatRoomId_userId: { chatRoomId: groupRoom.id, userId } },
        update: {},
        create: { chatRoomId: groupRoom.id, userId },
      });
    }

    return guest;
  });
}

/** Remove a Clerk-deleted user's local record (cascades to their content). */
export async function deleteUserByClerkId(clerkId: string) {
  await prisma.user.deleteMany({ where: { clerkId } });
}
