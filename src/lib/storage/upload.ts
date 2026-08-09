import "server-only";
import { cloudinary, UPLOAD_FOLDER } from "./cloudinary";

export type StorageResourceType = "image" | "video";
export type UploadScope = "posts" | "stories" | "avatars";
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
 * without a fresh server-issued signature). A profile avatar is just an
 * identity picture shown wherever a guest's name appears (feed, chat,
 * admin) — treating it as public `upload` avoids re-signing it everywhere
 * it's rendered, the same way Clerk's own avatar images are plain URLs.
 */
function deliveryTypeFor(scope: UploadScope): DeliveryType {
  return scope === "avatars" ? "upload" : "authenticated";
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
