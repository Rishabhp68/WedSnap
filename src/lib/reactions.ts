import { REACTION_TYPES } from "@/lib/validation/reaction";

export type ReactionType = (typeof REACTION_TYPES)[number];

/** The five reactions a guest can leave, in picker order. */
export const REACTION_META: Record<ReactionType, { emoji: string; label: string }> = {
  LOVE: { emoji: "❤️", label: "Love" },
  LIKE: { emoji: "👍", label: "Like" },
  HAHA: { emoji: "😂", label: "Haha" },
  WOW: { emoji: "😮", label: "Wow" },
  CELEBRATE: { emoji: "🎉", label: "Celebrate" },
};

export const REACTION_ORDER: ReactionType[] = ["LOVE", "LIKE", "HAHA", "WOW", "CELEBRATE"];

/** What a plain tap (rather than a long-press) leaves. */
export const DEFAULT_REACTION: ReactionType = "LOVE";

export type ReactionCounts = Partial<Record<ReactionType, number>>;

/** Reaction types present on a post, most-used first — drives the little emoji cluster on each post. */
export function topReactionTypes(counts: ReactionCounts, limit = 3): ReactionType[] {
  return (Object.entries(counts) as [ReactionType, number][])
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([type]) => type);
}

export function totalReactions(counts: ReactionCounts): number {
  return Object.values(counts).reduce((sum, n) => sum + (n ?? 0), 0);
}
