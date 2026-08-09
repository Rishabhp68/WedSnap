import { NextRequest, NextResponse } from "next/server";
import { getCurrentGuest } from "@/lib/auth/current-guest";
import { getFeedPostsPage } from "@/lib/data/posts";

export async function GET(req: NextRequest) {
  // Route handlers don't get the redirect-to-sign-in behavior requireGuest()
  // relies on (that only works from Server Components/Actions), so this
  // checks auth manually and returns a plain 401 instead.
  const guest = await getCurrentGuest();
  if (!guest) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cursor = req.nextUrl.searchParams.get("cursor") ?? undefined;
  const page = await getFeedPostsPage(guest.wedding.id, guest.user.id, cursor);

  return NextResponse.json(page);
}
