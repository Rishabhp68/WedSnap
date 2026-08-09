import { prisma } from "@/lib/db/client";

export async function getAdminOverviewStats(weddingId: string) {
  const [guestCount, postCount, commentCount, rsvpCounts] = await Promise.all([
    prisma.weddingGuest.count({ where: { weddingId } }),
    prisma.post.count({ where: { weddingId, isDeleted: false } }),
    prisma.comment.count({ where: { post: { weddingId }, isDeleted: false } }),
    prisma.rSVP.groupBy({ by: ["status"], where: { weddingId }, _count: true }),
  ]);

  const rsvpByStatus = { ATTENDING: 0, MAYBE: 0, NOT_ATTENDING: 0, PENDING: 0 };
  for (const row of rsvpCounts) {
    rsvpByStatus[row.status] = row._count;
  }
  rsvpByStatus.PENDING = Math.max(0, guestCount - rsvpCounts.reduce((sum, r) => sum + r._count, 0));

  return { guestCount, postCount, commentCount, rsvpByStatus };
}
