"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AdminForm } from "@/components/admin/admin-form";
import { ImageField } from "@/components/admin/image-field";
import { saveTimelineMomentAction } from "@/app/admin/timeline/actions";

export interface TimelineFormDefaults {
  id?: string;
  title?: string;
  description?: string;
  date?: string; // yyyy-MM-dd
  imageUrl?: string;
  order?: number;
}

export function TimelineForm({ defaults = {} }: { defaults?: TimelineFormDefaults }) {
  return (
    <AdminForm action={saveTimelineMomentAction} submitLabel={defaults.id ? "Save moment" : "Add moment"}>
      <input type="hidden" name="id" defaultValue={defaults.id} />

      <div className="space-y-1.5">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" defaultValue={defaults.title} placeholder="How We Met" required />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" defaultValue={defaults.description} rows={3} required />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="date">Date (optional)</Label>
          <Input id="date" name="date" type="date" defaultValue={defaults.date} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="order">Display order</Label>
          <Input id="order" name="order" type="number" min={0} defaultValue={defaults.order ?? 0} />
        </div>
      </div>

      <ImageField name="imageUrl" label="Photo" defaultValue={defaults.imageUrl} />
    </AdminForm>
  );
}
