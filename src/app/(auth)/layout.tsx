import Link from "next/link";
import { getCurrentWedding } from "@/lib/wedding/current";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const wedding = await getCurrentWedding();

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-10">
      <Link
        href="/"
        className="font-display mb-8 text-2xl tracking-wide text-primary"
      >
        {wedding.partnerOneName} <span className="text-accent-foreground/70">&amp;</span>{" "}
        {wedding.partnerTwoName}
      </Link>
      {children}
    </div>
  );
}
