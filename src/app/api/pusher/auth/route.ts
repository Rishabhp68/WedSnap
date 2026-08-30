import { NextRequest, NextResponse } from "next/server";
import { getCurrentGuest } from "@/lib/auth/current-guest";
import { prisma } from "@/lib/db/client";
import { pusherServer } from "@/lib/realtime/pusher-server";

const CHAT_CHANNEL_PATTERN = /^private-chat-(.+)$/;
const FEED_CHANNEL_PATTERN = /^private-feed-(.+)$/;
const LOCATION_CHANNEL_PATTERN = /^private-locations-(.+)$/;
const USER_CHANNEL_PATTERN = /^private-user-(.+)$/;

/**
 * Pusher calls this before letting a browser subscribe to a private
 * channel. We only hand out a valid signature after checking the requester
 * actually belongs where the channel name says — this is the real
 * authorization boundary, not just "is signed in".
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

  const chatMatch = channelName.match(CHAT_CHANNEL_PATTERN);
  if (chatMatch) {
    const chatRoomId = chatMatch[1];
    const membership = await prisma.chatMember.findUnique({
      where: { chatRoomId_userId: { chatRoomId, userId: guest.user.id } },
    });
    if (!membership) {
      return NextResponse.json({ error: "Not a member of this chat" }, { status: 403 });
    }
    return NextResponse.json(pusherServer.authorizeChannel(socketId, channelName));
  }

  const feedMatch = channelName.match(FEED_CHANNEL_PATTERN);
  if (feedMatch) {
    const weddingId = feedMatch[1];
    if (weddingId !== guest.wedding.id) {
      return NextResponse.json({ error: "Not a guest of this wedding" }, { status: 403 });
    }
    return NextResponse.json(pusherServer.authorizeChannel(socketId, channelName));
  }

  const locationMatch = channelName.match(LOCATION_CHANNEL_PATTERN);
  if (locationMatch) {
    const weddingId = locationMatch[1];
    if (weddingId !== guest.wedding.id) {
      return NextResponse.json({ error: "Not a guest of this wedding" }, { status: 403 });
    }
    return NextResponse.json(pusherServer.authorizeChannel(socketId, channelName));
  }

  const userMatch = channelName.match(USER_CHANNEL_PATTERN);
  if (userMatch) {
    // Strict equality, not a membership lookup: this channel carries message
    // previews, so subscribing to anyone else's would leak their DMs.
    if (userMatch[1] !== guest.user.id) {
      return NextResponse.json({ error: "Not your channel" }, { status: 403 });
    }
    return NextResponse.json(pusherServer.authorizeChannel(socketId, channelName));
  }

  return NextResponse.json({ error: "Unknown channel" }, { status: 403 });
}
