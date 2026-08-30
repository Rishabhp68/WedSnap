import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// This is a UX fast-path only (redirect anonymous visitors before they hit a
// protected page) — it is not the authorization boundary. Every server
// action/route/page that touches guest data calls requireGuest()/
// requireAdmin() (see lib/auth/current-guest.ts) itself, so protection
// never depends on this path list staying in sync with the route tree.
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
  // Branding assets. These are generated routes rather than files under
  // /public, so the extension-based exclusion in the matcher below can't
  // reach them — and a browser fetches all three from the public landing
  // page while signed out, where a redirect makes the app non-installable.
  "/icons(.*)",
  "/icon(.*)",
  "/apple-icon(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Run on everything except static assets and Next internals.
    //
    // Two extensions here are load-bearing and easy to lose: `mjs` for
    // MapLibre's worker (without it the worker redirects to sign-in and the
    // map renders blank) and `webmanifest`, which the browser fetches from the
    // public landing page while signed out — a redirect there makes the app
    // non-installable, and on iOS that means no notifications at all.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|mjs|webmanifest)$).*)",
    "/(api|trpc)(.*)",
  ],
};
