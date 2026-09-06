"use client";

import { useRef, useState } from "react";
import { ImageUp, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { uploadFileToCloudinary, validateImageFile } from "@/lib/storage/upload-client";

interface ImageFieldProps {
  name: string;
  label: string;
  defaultValue?: string;
}

/**
 * Admin image picker: paste a URL from anywhere, or upload straight from the
 * device. Both paths end up in the same hidden-ish text input, so the server
 * action still just reads one `imageUrl`-style string field.
 */
export function ImageField({ name, label, defaultValue = "" }: ImageFieldProps) {
  const [value, setValue] = useState(defaultValue);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelected(file: File | undefined) {
    if (!file) return;
    const error = validateImageFile(file);
    if (error) {
      toast.error(error);
      return;
    }

    setUploading(true);
    setProgress(0);
    try {
      const uploaded = await uploadFileToCloudinary(file, "wedding", setProgress);
      setValue(uploaded.url);
      toast.success("Image uploaded.");
    } catch {
      toast.error("Couldn't upload that image. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>

      <div className="flex gap-2">
        <Input
          id={name}
          name={name}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Paste an image URL, or upload →"
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="shrink-0"
        >
          {uploading ? <Loader2 className="animate-spin" /> : <ImageUp />}
          {uploading ? `${progress}%` : "Upload"}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFileSelected(e.target.files?.[0])}
        />
      </div>

      {value ? (
        <div className="relative mt-2 w-fit">
          {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary admin-supplied URL, previewed as-is before it's saved */}
          <img
            src={value}
            alt=""
            className="h-24 w-40 rounded-lg border border-border object-cover"
            onError={(e) => {
              e.currentTarget.style.opacity = "0.25";
            }}
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
