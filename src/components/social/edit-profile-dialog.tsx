"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { updateProfileAction, type UpdateProfileState } from "@/app/app/profile/actions";
import { uploadFileToCloudinary, validateImageFile } from "@/lib/storage/upload-client";

interface EditProfileDialogProps {
  name: string;
  bio: string | null;
  avatarUrl: string | null;
}

const initialState: UpdateProfileState = { ok: false };

export function EditProfileDialog({ name, bio, avatarUrl }: EditProfileDialogProps) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(avatarUrl);
  const [pendingAvatarUrl, setPendingAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [state, formAction, isPending] = useActionState(updateProfileAction, initialState);

  useEffect(() => {
    // Intentional: reacting to a completed server action result (an
    // external async event), not a derived value.
    /* eslint-disable react-hooks/set-state-in-effect */
    if (state.ok) {
      toast.success("Profile updated.");
      setOpen(false);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
    if (state.error) toast.error(state.error);
  }, [state]);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const error = validateImageFile(file);
    if (error) {
      toast.error(error);
      return;
    }
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const uploaded = await uploadFileToCloudinary(file, "avatars");
      setPendingAvatarUrl(uploaded.url);
    } catch {
      toast.error("Couldn't upload that photo. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" className="rounded-full" />}>
        Edit profile
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="avatarUrl" value={pendingAvatarUrl ?? ""} />

          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="group relative"
              aria-label="Change profile photo"
            >
              <Avatar className="size-20">
                <AvatarImage src={preview ?? undefined} alt="" />
                <AvatarFallback>{name.slice(0, 1)}</AvatarFallback>
              </Avatar>
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                {uploading ? (
                  <Loader2 className="size-5 animate-spin text-white" />
                ) : (
                  <Camera className="size-5 text-white" />
                )}
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </button>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" defaultValue={name} maxLength={80} required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              name="bio"
              defaultValue={bio ?? ""}
              maxLength={280}
              rows={3}
              className="resize-none"
              placeholder="Tell other guests a little about yourself"
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending || uploading}>
              {isPending ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
