"use server";

import { requireAdmin, requireGuest } from "@/lib/auth/current-guest";
import { getUploadSignature, type StorageResourceType, type UploadScope } from "@/lib/storage/upload";

/**
 * Shared by every upload surface (camera/post, story, avatar, admin wedding
 * imagery) so each one gets a signature scoped to the caller's *own*
 * wedding — never trusts a client-supplied wedding slug.
 *
 * The "wedding" scope writes the public imagery shown on the invitation
 * itself, so it requires the admin role rather than just being signed in.
 */
export async function getUploadSignatureAction(scope: UploadScope, resourceType: StorageResourceType) {
  const { wedding } = scope === "wedding" ? await requireAdmin() : await requireGuest();
  return getUploadSignature({ weddingSlug: wedding.slug, resourceType, scope });
}
