"use client";

import { useRef, useState } from "react";
import { Loader2, Video, X } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { uploadFileToCloudinary, validateMediaFile } from "@/lib/storage/upload-client";

interface VideoFieldProps {
  name: string;
  label: string;
  description?: string;
  defaultValue?: string;
}

/**
 * Admin video picker. Same shape as ImageField — paste a URL or upload from
 * the device, both ending in one text input the server action reads.
 *
 * Separate from ImageField rather than a shared component with a `kind` prop:
 * the accept filter, the validator, the preview element and the empty-state
 * copy all differ, which is most of what either component is.
 */
export function VideoField({ name, label, description, defaultValue = "" }: VideoFieldProps) {
  const [value, setValue] = useState(defaultValue);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelected(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      toast.error("Please choose a video file.");
      return;
    }
    const error = validateMediaFile(file);
    if (error) {
      toast.error(error);
      return;
    }

    setUploading(true);
    setProgress(0);
    try {
      const uploaded = await uploadFileToCloudinary(file, "wedding", setProgress);
      setValue(uploaded.url);
      toast.success("Video uploaded.");
    } catch {
      toast.error("Couldn't upload that video. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}

      <div className="flex gap-2">
        <Input
          id={name}
          name={name}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Paste a video URL, or upload →"
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="shrink-0"
        >
          {uploading ? <Loader2 className="animate-spin" /> : <Video />}
          {uploading ? `${progress}%` : "Upload"}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => handleFileSelected(e.target.files?.[0])}
        />
      </div>

      {value ? (
        <div className="relative mt-2 w-fit">
          {/* Muted and controlled here on purpose: this is a check that the
              right file uploaded, not the guest-facing playback. */}
          <video
            src={value}
            controls
            muted
            playsInline
            preload="metadata"
            className="h-32 w-56 rounded-lg border border-border bg-black object-cover"
          />
          <button
            type="button"
            onClick={() => setValue("")}
            className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full bg-foreground text-background"
            aria-label={`Remove ${label.toLowerCase()}`}
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
