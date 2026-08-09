import type { PostMedia } from "@/generated/prisma/client";
import { getSignedMediaUrl } from "./getSignedUrl";

/**
 * Seed data stores plain (already-public) placeholder URLs directly; real
 * guest uploads store a Cloudinary `authenticated` public_id and need a
 * freshly signed URL computed here, server-side, after the caller has
 * already confirmed the viewer is authorized to see this wedding's media.
 */
export function resolveMediaUrl(
  media: Pick<PostMedia, "storageKey" | "url" | "mediaType">,
  options?: { width?: number; height?: number },
): string {
  if (media.storageKey.startsWith("seed/")) {
    return media.url;
  }
  return getSignedMediaUrl(media.storageKey, {
    resourceType: media.mediaType === "VIDEO" ? "video" : "image",
    ...options,
  });
}
