import { Skeleton } from "@/components/ui/skeleton";

/**
 * Every /app route is server-rendered per request (Clerk auth + database
 * queries), so without a Suspense boundary a nav tap changes nothing on
 * screen until the whole response arrives — which reads as the app having
 * frozen. This streams instantly and covers each nested segment that doesn't
 * define its own loading state.
 */
export default function AppLoading() {
  return (
    <div className="mx-auto max-w-xl px-4 pt-safe pb-6">
      <Skeleton className="mt-4 h-8 w-40" />

      <div className="mt-5 flex gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="size-16 shrink-0 rounded-full" />
        ))}
      </div>

      <div className="mt-6 space-y-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-3xl border border-border">
            <div className="flex items-center gap-3 p-4">
              <Skeleton className="size-9 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="aspect-4/5 w-full rounded-none" />
            <div className="space-y-2 p-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3.5 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
