import "server-only";
import { cloudinary, UPLOAD_FOLDER } from "./cloudinary";

export type StorageResourceType = "image" | "video";
export type UploadScope = "posts" | "stories" | "avatars" | "wedding";
export type DeliveryType = "authenticated" | "upload";

export interface UploadSignatureInput {
  weddingSlug: string;
  resourceType: StorageResourceType;
  /** Sub-folder within the wedding's folder, e.g. "posts" or "stories". */
  scope: UploadScope;
}

export interface UploadSignature {
  timestamp: number;
  signature: string;
  apiKey: string;
  cloudName: string;
  folder: string;
  type: DeliveryType;
  resourceType: StorageResourceType;
  allowedFormats: string;
}

const ALLOWED_FORMATS: Record<StorageResourceType, string> = {
  image: "jpg,jpeg,png,webp,heic",
  video: "mp4,mov,webm",
};

/**
 * Feed/story photos are private wedding content, so they upload as
 * Cloudinary `authenticated` assets (see getSignedUrl.ts — unreadable
 * without a fresh server-issued signature).
 *
 * Avatars and admin-managed "wedding" imagery (hero, cover, event and Our
 * Story photos) are public by nature — the latter render on the public
 * invitation page, and both are stored as plain URL strings rather than a
 * storageKey that gets re-signed per request, so they use public `upload`
 * delivery.
 */
function deliveryTypeFor(scope: UploadScope): DeliveryType {
  return scope === "avatars" || scope === "wedding" ? "upload" : "authenticated";
}

/**
 * Produces the params + signature a guest's browser needs to upload a file
 * directly to Cloudinary — the file bytes never pass through our server, so
 * a Vercel function's body-size/duration limits are never in play.
 *
 * `allowed_formats` is included in the signature, so Cloudinary enforces it
 * server-side — a guest can't bypass the client's file-type check by
 * editing the request.
 */
export function getUploadSignature({
  weddingSlug,
  resourceType,
  scope,
}: UploadSignatureInput): UploadSignature {
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  if (!apiSecret || !apiKey || !cloudName) {
    throw new Error("Cloudinary is not configured. See .env.example.");
  }

  const timestamp = Math.round(Date.now() / 1000);
  const folder = `${UPLOAD_FOLDER}/${weddingSlug}/${scope}`;
  const allowedFormats = ALLOWED_FORMATS[resourceType];
  const type = deliveryTypeFor(scope);

  const signature = cloudinary.utils.api_sign_request(
    { allowed_formats: allowedFormats, folder, timestamp, type },
    apiSecret,
  );

  return {
    timestamp,
    signature,
    apiKey,
    cloudName,
    folder,
    type,
    resourceType,
    allowedFormats,
  };
}
