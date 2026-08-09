import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { NextRequest, NextResponse } from "next/server";
import {
  deleteUserByClerkId,
  ensureWeddingMembership,
  syncUserFromClerk,
} from "@/lib/auth/sync";

// Keeps the local User/WeddingGuest rows (and their derived state, like chat
// membership) in sync with Clerk without the app ever touching passwords or
// session state itself. See lib/auth/current-guest.ts for the read-time
// fallback that covers the gap before this webhook has fired.
export async function POST(req: NextRequest) {
  let evt: Awaited<ReturnType<typeof verifyWebhook>>;
  try {
    evt = await verifyWebhook(req);
  } catch (error) {
    console.error("Clerk webhook signature verification failed", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (evt.type) {
    case "user.created":
    case "user.updated": {
      const data = evt.data;
      const primaryEmail = data.email_addresses?.find(
        (e) => e.id === data.primary_email_address_id,
      );
      const user = await syncUserFromClerk({
        id: data.id,
        firstName: data.first_name,
        lastName: data.last_name,
        primaryEmailAddress: primaryEmail ? { emailAddress: primaryEmail.email_address } : null,
        emailAddresses: data.email_addresses?.map((e) => ({ emailAddress: e.email_address })),
        imageUrl: data.image_url,
      });
      await ensureWeddingMembership(user.id, data.id);
      break;
    }
    case "user.deleted": {
      if (evt.data.id) {
        await deleteUserByClerkId(evt.data.id);
      }
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
