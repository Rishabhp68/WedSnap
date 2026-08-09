import { getUploadSignatureAction } from "@/lib/actions/media";
import type { UploadScope } from "@/lib/storage/upload";

export const MAX_IMAGE_BYTES = 15 * 1024 * 1024; // 15MB
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100MB
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];

export interface UploadedMedia {
  storageKey: string;
  url: string;
  mimeType: string;
  width: number;
  height: number;
  sizeBytes: number;
  mediaType: "IMAGE" | "VIDEO";
}

export function validateImageFile(file: File): string | null {
  if (!file.type.startsWith("image/")) return "Please choose a photo.";
  if (file.size > MAX_IMAGE_BYTES) return "That photo is too large (max 15MB).";
  return null;
}

/**
 * Uploads directly from the browser to Cloudinary using a short-lived
 * signature from our server — the file's bytes never touch our Next.js
 * server, so there's no serverless body-size/duration limit to worry about.
 * Uses XHR (not fetch) specifically so we can report upload progress.
 */
export function uploadFileToCloudinary(
  file: File,
  scope: UploadScope,
  onProgress?: (percent: number) => void,
): Promise<UploadedMedia> {
  const resourceType = file.type.startsWith("video/") ? "video" : "image";

  return getUploadSignatureAction(scope, resourceType).then(
    (sig) =>
      new Promise<UploadedMedia>((resolve, reject) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("api_key", sig.apiKey);
        formData.append("timestamp", String(sig.timestamp));
        formData.append("signature", sig.signature);
        formData.append("folder", sig.folder);
        formData.append("type", sig.type);
        formData.append("allowed_formats", sig.allowedFormats);

        const xhr = new XMLHttpRequest();
        xhr.open("POST", `https://api.cloudinary.com/v1_1/${sig.cloudName}/${resourceType}/upload`);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable && onProgress) {
            onProgress(Math.round((event.loaded / event.total) * 100));
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const data = JSON.parse(xhr.responseText);
            resolve({
              storageKey: data.public_id,
              url: data.secure_url,
              mimeType: `${resourceType}/${data.format}`,
              width: data.width ?? 0,
              height: data.height ?? 0,
              sizeBytes: data.bytes ?? file.size,
              mediaType: resourceType === "video" ? "VIDEO" : "IMAGE",
            });
          } else {
            reject(new Error("Upload failed. Please try again."));
          }
        };
        xhr.onerror = () => reject(new Error("Upload failed. Please check your connection."));
        xhr.send(formData);
      }),
  );
}
