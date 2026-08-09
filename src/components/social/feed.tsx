"use client";

import { useCallback, useState } from "react";
import { useInView } from "react-intersection-observer";
import Link from "next/link";
import { Camera } from "lucide-react";
import { PostCard } from "./post-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import type { FeedPost } from "@/lib/data/posts";

interface FeedProps {
  initialPosts: FeedPost[];
  initialCursor: string | null;
}

export function Feed({ initialPosts, initialCursor }: FeedProps) {
  const [posts, setPosts] = useState(initialPosts);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const loadMore = useCallback(async () => {
    if (!cursor || loading) return;
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/posts?cursor=${cursor}`);
      if (!res.ok) throw new Error("Request failed");
      const data: { posts: FeedPost[]; nextCursor: string | null } = await res.json();
      setPosts((prev) => [...prev, ...data.posts]);
      setCursor(data.nextCursor);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [cursor, loading]);

  const { ref } = useInView({
    onChange: (inView) => {
      if (inView) loadMore();
    },
  });

  if (posts.length === 0) {
    return (
      <EmptyState
        icon={Camera}
        title="Be the first to capture a moment."
        description="Guest photos and videos will show up here as soon as someone shares one."
        action={
          <Button asChild size="sm" className="rounded-full">
            <Link href="/app/camera">Share a photo</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}

      {cursor ? (
        <div ref={ref} className="py-2">
          {loading ? (
            <Skeleton className="h-96 rounded-3xl" />
          ) : error ? (
            <div className="flex flex-col items-center gap-2 py-4 text-center">
              <p className="text-sm text-muted-foreground">Couldn&apos;t load more photos.</p>
              <Button variant="outline" size="sm" onClick={loadMore}>
                Retry
              </Button>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="py-6 text-center text-xs text-muted-foreground">You&apos;re all caught up 🎉</p>
      )}
    </div>
  );
}
