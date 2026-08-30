import { Skeleton } from "@/components/ui/skeleton";

export default function ChatLoading() {
  return (
    <div className="mx-auto max-w-xl px-4 pt-safe pb-6">
      <div className="flex items-center justify-between pt-4">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="size-10 rounded-full" />
      </div>
      <Skeleton className="mt-4 h-11 w-full rounded-full" />
      <div className="mt-4 space-y-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-2 py-2.5">
            <Skeleton className="size-12 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
