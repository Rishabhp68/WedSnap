import { NextRequest, NextResponse } from "next/server";
import { getCurrentGuest } from "@/lib/auth/current-guest";
import { prisma } from "@/lib/db/client";
import { getMessagesPage } from "@/lib/data/chat";

export async function GET(req: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  const guest = await getCurrentGuest();
  if (!guest) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { roomId } = await params;
  const membership = await prisma.chatMember.findUnique({
    where: { chatRoomId_userId: { chatRoomId: roomId, userId: guest.user.id } },
  });
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const cursor = req.nextUrl.searchParams.get("cursor") ?? undefined;
  const page = await getMessagesPage(roomId, cursor);
  return NextResponse.json(page);
}
