import { NextRequest, NextResponse } from "next/server";
import { getCurrentGuest } from "@/lib/auth/current-guest";
import { prisma } from "@/lib/db/client";
import { pusherServer } from "@/lib/realtime/pusher-server";

const CHAT_CHANNEL_PATTERN = /^private-chat-(.+)$/;

/**
 * Pusher calls this before letting a browser subscribe to a private
 * channel. We only hand out a valid signature if the requester is actually
 * a member of the chat room encoded in the channel name — this is the real
 * authorization boundary for chat, not just "is signed in".
 */
export async function POST(req: NextRequest) {
  const guest = await getCurrentGuest();
  if (!guest) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const socketId = formData.get("socket_id");
  const channelName = formData.get("channel_name");
  if (typeof socketId !== "string" || typeof channelName !== "string") {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const match = channelName.match(CHAT_CHANNEL_PATTERN);
  if (!match) {
    return NextResponse.json({ error: "Unknown channel" }, { status: 403 });
  }
  const chatRoomId = match[1];

  const membership = await prisma.chatMember.findUnique({
    where: { chatRoomId_userId: { chatRoomId, userId: guest.user.id } },
  });
  if (!membership) {
    return NextResponse.json({ error: "Not a member of this chat" }, { status: 403 });
  }

  const authResponse = pusherServer.authorizeChannel(socketId, channelName);
  return NextResponse.json(authResponse);
}
