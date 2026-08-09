import { prisma } from "@/lib/db/client";

export async function getGuestProfileStats(weddingId: string, userId: string) {
  const [postCount, rsvp] = await Promise.all([
    prisma.post.count({ where: { weddingId, userId, isDeleted: false } }),
    prisma.rSVP.findUnique({ where: { weddingId_userId: { weddingId, userId } } }),
  ]);
  return { postCount, rsvp };
}
