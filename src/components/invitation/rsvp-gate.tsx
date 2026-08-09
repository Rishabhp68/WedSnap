"use client";

import { SignInButton, useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RsvpForm } from "./rsvp-form";

/**
 * Signing in *is* the RSVP identity — there's no separate invite-code flow —
 * so an unauthenticated visitor sees a one-tap sign-in prompt here instead
 * of a form they can't submit. Client-side because it depends on Clerk's
 * browser session state (see JoinCelebrationCta for why).
 */
export function RsvpGate() {
  const { isLoaded, isSignedIn } = useUser();

  if (!isLoaded) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 rounded-2xl" />
        <Skeleton className="h-16 rounded-2xl" />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-border bg-card/60 px-6 py-10 text-center">
        <p className="text-sm text-muted-foreground">
          Sign in with your name to send your RSVP — it takes a few seconds.
        </p>
        <SignInButton mode="modal" forceRedirectUrl="/">
          <Button size="lg" className="rounded-full">
            Sign In to RSVP
          </Button>
        </SignInButton>
      </div>
    );
  }

  return <RsvpForm />;
}
