import "server-only";
import { cloudinary } from "./cloudinary";
import type { StorageResourceType } from "./upload";

export async function deleteMedia(
  publicId: string,
  resourceType: StorageResourceType = "image",
): Promise<void> {
  await cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType,
    type: "authenticated",
    invalidate: true,
  });
}
