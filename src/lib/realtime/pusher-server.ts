import "server-only";
import PusherServer from "pusher";

declare global {
  var __pusherServer: PusherServer | undefined;
}

function createPusherServer() {
  return new PusherServer({
    appId: process.env.PUSHER_APP_ID!,
    key: process.env.PUSHER_KEY!,
    secret: process.env.PUSHER_SECRET!,
    cluster: process.env.PUSHER_CLUSTER!,
    useTLS: true,
  });
}

export const pusherServer = globalThis.__pusherServer ?? createPusherServer();

if (process.env.NODE_ENV !== "production") {
  globalThis.__pusherServer = pusherServer;
}
