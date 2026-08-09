/**
 * Channel/event naming lives here so the server (trigger) and client
 * (subscribe) sides can't drift, and so swapping Pusher for another pub/sub
 * provider later only touches pusher-server.ts / pusher-client.ts.
 */

export function chatRoomChannel(chatRoomId: string): string {
  // "private-" prefix requires Pusher channel authorization — see
  // app/api/pusher/auth/route.ts, which checks ChatMember before granting it.
  return `private-chat-${chatRoomId}`;
}

export const CHAT_EVENTS = {
  NEW_MESSAGE: "new-message",
} as const;
