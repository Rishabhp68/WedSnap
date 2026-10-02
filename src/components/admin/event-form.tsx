"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownHint } from "@/components/admin/markdown-hint";
import { Label } from "@/components/ui/label";
import { AdminForm } from "@/components/admin/admin-form";
import { ImageField } from "@/components/admin/image-field";
import { saveEventAction } from "@/app/admin/events/actions";

export interface EventFormDefaults {
  id?: string;
  name?: string;
  description?: string;
  date?: string; // yyyy-MM-dd
  startTime?: string; // yyyy-MM-dd'T'HH:mm
  endTime?: string; // yyyy-MM-dd'T'HH:mm
  venueName?: string;
  venueAddress?: string;
  dressCode?: string;
  imageUrl?: string;
  mapUrl?: string;
  order?: number;
}

export function EventForm({ defaults = {} }: { defaults?: EventFormDefaults }) {
  return (
    <AdminForm action={saveEventAction} submitLabel={defaults.id ? "Save event" : "Add event"}>
      <input type="hidden" name="id" defaultValue={defaults.id} />

      <div className="space-y-1.5">
        <Label htmlFor="name">Event name</Label>
        <Input id="name" name="name" defaultValue={defaults.name} placeholder="Mehendi" required />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" defaultValue={defaults.description} rows={4} />
        <MarkdownHint />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="date">Date</Label>
          <Input id="date" name="date" type="date" defaultValue={defaults.date} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="startTime">Start time</Label>
          <Input id="startTime" name="startTime" type="datetime-local" defaultValue={defaults.startTime} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="endTime">End time</Label>
          <Input id="endTime" name="endTime" type="datetime-local" defaultValue={defaults.endTime} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="venueName">Venue name</Label>
          <Input id="venueName" name="venueName" defaultValue={defaults.venueName} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dressCode">Dress code</Label>
          <Input id="dressCode" name="dressCode" defaultValue={defaults.dressCode} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="venueAddress">Venue address</Label>
        <Textarea id="venueAddress" name="venueAddress" defaultValue={defaults.venueAddress} rows={2} required />
      </div>

      <ImageField name="imageUrl" label="Event image" defaultValue={defaults.imageUrl} />

      <div className="space-y-1.5">
        <Label htmlFor="mapUrl">Map link</Label>
        <Input id="mapUrl" name="mapUrl" defaultValue={defaults.mapUrl} placeholder="https://maps.google.com/..." />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="order">Display order</Label>
        <Input id="order" name="order" type="number" min={0} defaultValue={defaults.order ?? 0} className="max-w-24" />
      </div>
    </AdminForm>
  );
}
