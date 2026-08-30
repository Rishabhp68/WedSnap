import { Skeleton } from "@/components/ui/skeleton";

export default function WeddingLoading() {
  return (
    <div className="pb-6">
      {/* Mirrors the hero's full-height frame so the page doesn't jump when
          the real content swaps in. */}
      <Skeleton className="h-dvh w-full rounded-none" />
      <div className="mx-auto max-w-3xl space-y-4 px-6 py-12">
        <Skeleton className="mx-auto h-4 w-24" />
        <Skeleton className="mx-auto h-8 w-3/4" />
        <Skeleton className="mx-auto h-3.5 w-1/2" />
      </div>
    </div>
  );
}
