"use server";

import { requireGuest } from "@/lib/auth/current-guest";
import { getUploadSignature, type StorageResourceType, type UploadScope } from "@/lib/storage/upload";

/**
 * Shared by every upload surface (camera/post, story, avatar) so each one
 * gets a signature scoped to the caller's *own* wedding — never trusts a
 * client-supplied wedding slug.
 */
export async function getUploadSignatureAction(scope: UploadScope, resourceType: StorageResourceType) {
  const { wedding } = await requireGuest();
  return getUploadSignature({ weddingSlug: wedding.slug, resourceType, scope });
}
