import { Skeleton } from "@/components/ui/skeleton";

export default function MapLoading() {
  return (
    <div className="flex h-[calc(100dvh-4rem-5rem)] flex-col md:h-[calc(100dvh-4rem)]">
      <header className="shrink-0 space-y-2 border-b border-border px-4 py-3">
        <Skeleton className="h-6 w-36" />
        <Skeleton className="h-3 w-64" />
      </header>
      <Skeleton className="min-h-0 flex-1 rounded-none" />
    </div>
  );
}
