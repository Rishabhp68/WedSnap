"use client";

import Link from "next/link";
import { SignInButton, useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface JoinCelebrationCtaProps {
  className?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
}

/**
 * A "use client" island so the auth check happens in the browser (via
 * Clerk's client SDK) instead of a server-side `auth()` call — that keeps
 * the invitation page around it statically rendered/ISR-cached rather than
 * forcing per-request dynamic rendering just for one button's label.
 */
export function JoinCelebrationCta({ className, variant = "default" }: JoinCelebrationCtaProps) {
  const { isLoaded, isSignedIn } = useUser();

  if (!isLoaded) {
    return (
      <Button size="lg" variant={variant} className={cn("opacity-0", className)} disabled aria-hidden>
        Join the Celebration
      </Button>
    );
  }

  if (isSignedIn) {
    return (
      <Button size="lg" variant={variant} className={className} asChild>
        <Link href="/app">Go to the Wedding App</Link>
      </Button>
    );
  }

  return (
    <SignInButton mode="modal" forceRedirectUrl="/app">
      <Button size="lg" variant={variant} className={className}>
        Join the Celebration
      </Button>
    </SignInButton>
  );
}
