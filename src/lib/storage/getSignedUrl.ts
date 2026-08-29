import "server-only";
import { cloudinary } from "./cloudinary";
import type { StorageResourceType } from "./upload";

export interface SignedMediaUrlOptions {
  width?: number;
  height?: number;
  crop?: "fill" | "fit" | "limit" | "thumb";
  resourceType?: StorageResourceType;
  /** Overrides the delivered format — "jpg" against a video yields a still frame. */
  format?: string;
}

// Only used if CLOUDINARY_MEDIA_AUTH_KEY is set (Cloudinary "token-based
// authentication" enabled in the dashboard) — see getSignedMediaUrl below.
const AUTH_TOKEN_DURATION_SECONDS = 60 * 10;

/**
 * Turns a stored Cloudinary public_id (PostMedia.storageKey) into a
 * ready-to-render delivery URL. This is called at render time, inside a
 * Server Component that has already checked the viewer is a guest of this
 * wedding — so a signed URL for private content is only ever handed to
 * someone who was already authorized to see it.
 *
 * Without CLOUDINARY_MEDIA_AUTH_KEY: the URL is cryptographically signed
 * with the account API secret and only works because `type: authenticated`
 * assets reject unsigned requests — a guest can't forward-guess other
 * guests' media URLs.
 * With CLOUDINARY_MEDIA_AUTH_KEY set (and "Strict token authentication"
 * enabled for the asset type in the Cloudinary dashboard): the URL also
 * carries a short expiry, so a copied link stops working after ~10 minutes.
 */
export function getSignedMediaUrl(publicId: string, options: SignedMediaUrlOptions = {}): string {
  const { width, height, crop = "fill", resourceType = "image", format } = options;

  // `gravity: auto` is content-aware cropping, which is an image-only feature
  // on Cloudinary — sending it on a video transformation risks a delivery
  // error, so video just gets scaled to width. An explicit image `format`
  // against a video asset means "extract a still frame", and that output is
  // an image again, so it takes the image treatment.
  const deliversVideo = resourceType === "video" && !format;
  const sizing = width || height ? { width, height, crop: deliversVideo ? "limit" : crop } : {};

  const transformation = [
    {
      ...sizing,
      ...(width || height ? (deliversVideo ? {} : { gravity: "auto" }) : {}),
      quality: "auto",
      // f_auto negotiates the format from the request, which would override an
      // explicitly requested one.
      ...(format ? {} : { fetch_format: "auto" }),
    },
  ];

  const authTokenKey = process.env.CLOUDINARY_MEDIA_AUTH_KEY;

  return cloudinary.url(publicId, {
    resource_type: resourceType,
    type: "authenticated",
    secure: true,
    sign_url: true,
    transformation,
    ...(format ? { format } : {}),
    ...(authTokenKey
      ? { auth_token: { key: authTokenKey, duration: AUTH_TOKEN_DURATION_SECONDS } }
      : {}),
  });
}
