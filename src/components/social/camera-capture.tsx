"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Camera as CameraIcon, ImagePlus, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { createPostAction, type CreatePostState } from "@/app/app/camera/actions";
import { uploadFileToCloudinary, validateImageFile, type UploadedMedia } from "@/lib/storage/upload-client";

const initialState: CreatePostState = { ok: false };

export function CameraCapture() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [uploadedMedia, setUploadedMedia] = useState<UploadedMedia | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [state, formAction, isPending] = useActionState(createPostAction, initialState);

  useEffect(() => {
    // Intentional: resetting local UI state in response to a completed
    // server action result (an external async event), not a derived value.
    /* eslint-disable react-hooks/set-state-in-effect */
    if (state.error) {
      toast.error(state.error);
      setProgress(null);
      setUploadedMedia(null);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [state]);

  // The upload (to Cloudinary) and the post creation (server action) are two
  // separate async steps — once the upload resolves and the hidden `media`
  // field reflects it, submit the form to run the server action.
  useEffect(() => {
    if (uploadedMedia) {
      formRef.current?.requestSubmit();
    }
  }, [uploadedMedia]);

  function handleFileSelected(selected: File | undefined) {
    if (!selected) return;
    const error = validateImageFile(selected);
    if (error) {
      toast.error(error);
      return;
    }
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
  }

  function retake() {
    setFile(null);
    setPreviewUrl(null);
    setProgress(null);
    setUploadedMedia(null);
  }

  async function handlePost() {
    if (!file) return;
    setProgress(0);
    try {
      const uploaded = await uploadFileToCloudinary(file, "posts", setProgress);
      setUploadedMedia(uploaded);
    } catch {
      toast.error("Couldn't upload that photo. Please try again.");
      setProgress(null);
    }
  }

  if (!previewUrl) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 px-6 py-16 text-center">
        <div className="flex size-24 items-center justify-center rounded-full bg-primary/10">
          <CameraIcon className="size-10 text-primary" />
        </div>
        <div>
          <h1 className="font-display text-2xl">Share a moment</h1>
          <p className="mt-2 max-w-xs text-sm text-muted-foreground">
            Take a photo or choose one from your gallery to share with everyone at the wedding.
          </p>
        </div>
        <div className="flex w-full max-w-xs flex-col gap-3">
          <Button size="lg" className="h-14 rounded-full" onClick={() => cameraInputRef.current?.click()}>
            <CameraIcon /> Take a Photo
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-14 rounded-full"
            onClick={() => galleryInputRef.current?.click()}
          >
            <ImagePlus /> Choose from Gallery
          </Button>
        </div>

        {/* `capture="environment"` opens the device's native camera UI on
            mobile browsers — no getUserMedia/permissions plumbing needed. */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => handleFileSelected(e.target.files?.[0])}
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFileSelected(e.target.files?.[0])}
        />
      </div>
    );
  }

  return (
    <div className="px-4 pb-6">
      <div className="relative mx-auto aspect-4/5 w-full max-w-sm overflow-hidden rounded-3xl bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element -- local blob: preview, Next/Image can't optimize it */}
        <img src={previewUrl} alt="" className="absolute inset-0 size-full object-cover" />
        {progress === null ? (
          <button
            onClick={retake}
            className="absolute top-3 left-3 flex size-9 items-center justify-center rounded-full bg-black/50 text-white"
            aria-label="Retake"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>

      <form ref={formRef} action={formAction} className="mx-auto mt-4 max-w-sm space-y-4">
        <input type="hidden" name="caption" value={caption} />
        <input type="hidden" name="media" value={uploadedMedia ? JSON.stringify([uploadedMedia]) : ""} />

        {progress === null ? (
          <>
            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Add a caption (optional)"
              rows={2}
              maxLength={500}
              className="resize-none rounded-2xl"
            />
            <div className="flex gap-3">
              <Button type="button" variant="outline" className="h-12 flex-1 rounded-full" onClick={retake}>
                <RotateCcw /> Retake
              </Button>
              <Button type="button" className="h-12 flex-1 rounded-full" onClick={handlePost}>
                Post
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-2 py-2">
            <Progress value={progress} />
            <p className="text-center text-xs text-muted-foreground">
              {isPending ? "Sharing your moment..." : `Uploading... ${progress}%`}
            </p>
          </div>
        )}
      </form>
    </div>
  );
}
