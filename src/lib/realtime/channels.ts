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

/** One shared channel per wedding for feed-wide updates (new posts, reaction/comment counts). */
export function feedChannel(weddingId: string): string {
  return `private-feed-${weddingId}`;
}

export const FEED_EVENTS = {
  NEW_POST: "new-post",
  REACTION_UPDATED: "reaction-updated",
  COMMENT_ADDED: "comment-added",
} as const;

/** One shared channel per wedding for the live guest map. */
export function locationChannel(weddingId: string): string {
  return `private-locations-${weddingId}`;
}

export const LOCATION_EVENTS = {
  LOCATION_UPDATED: "location-updated",
  SHARING_STOPPED: "sharing-stopped",
} as const;
