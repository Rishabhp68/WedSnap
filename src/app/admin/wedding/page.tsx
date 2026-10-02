import { formatInTimeZone } from "date-fns-tz";
import { requireAdmin } from "@/lib/auth/current-guest";
import { prisma } from "@/lib/db/client";
import { AdminForm } from "@/components/admin/admin-form";
import { ImageField } from "@/components/admin/image-field";
import { VideoField } from "@/components/admin/video-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownHint } from "@/components/admin/markdown-hint";
import { Label } from "@/components/ui/label";
import { updateWeddingDetailsAction, updateVenueAction } from "./actions";

export default async function AdminWeddingPage() {
  const { wedding } = await requireAdmin();
  const venue = await prisma.venue.findUnique({ where: { weddingId: wedding.id } });
  const localDateTime = formatInTimeZone(wedding.weddingDate, wedding.timezone, "yyyy-MM-dd'T'HH:mm");

  return (
    <div className="max-w-xl space-y-10">
      <section>
        <h2 className="font-display text-2xl">Wedding details</h2>
        <AdminForm action={updateWeddingDetailsAction} successMessage="Wedding details updated." className="mt-5 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="partnerOneName">Partner 1 name</Label>
              <Input id="partnerOneName" name="partnerOneName" defaultValue={wedding.partnerOneName} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="partnerTwoName">Partner 2 name</Label>
              <Input id="partnerTwoName" name="partnerTwoName" defaultValue={wedding.partnerTwoName} required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tagline">Tagline</Label>
            <Textarea id="tagline" name="tagline" defaultValue={wedding.tagline ?? ""} rows={2} maxLength={200} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="weddingDate">Wedding date &amp; time</Label>
              <Input id="weddingDate" name="weddingDate" type="datetime-local" defaultValue={localDateTime} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="timezone">Timezone (IANA)</Label>
              <Input id="timezone" name="timezone" defaultValue={wedding.timezone} required />
            </div>
          </div>
          <ImageField name="heroImageUrl" label="Hero image" defaultValue={wedding.heroImageUrl ?? ""} />
          <ImageField name="coverImageUrl" label="Cover image" defaultValue={wedding.coverImageUrl ?? ""} />
          <VideoField
            name="saveTheDateVideoUrl"
            label="Save the date film"
            description="Plays full screen once a guest opens the envelope, then the invitation appears. Leave empty to go straight to the invitation."
            defaultValue={wedding.saveTheDateVideoUrl ?? ""}
          />
        </AdminForm>
      </section>

      <section>
        <h2 className="font-display text-2xl">Venue</h2>
        <AdminForm action={updateVenueAction} successMessage="Venue updated." className="mt-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Venue name</Label>
            <Input id="name" name="name" defaultValue={venue?.name ?? ""} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="address">Address</Label>
            <Textarea id="address" name="address" defaultValue={venue?.address ?? ""} rows={2} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mapUrl">Map link</Label>
            <Input id="mapUrl" name="mapUrl" defaultValue={venue?.mapUrl ?? ""} placeholder="https://maps.google.com/..." />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="parkingInfo">Parking info</Label>
            <Textarea id="parkingInfo" name="parkingInfo" defaultValue={venue?.parkingInfo ?? ""} rows={4} />
            <MarkdownHint />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="instructions">Additional instructions</Label>
            <Textarea id="instructions" name="instructions" defaultValue={venue?.instructions ?? ""} rows={4} />
            <MarkdownHint />
          </div>
        </AdminForm>
      </section>
    </div>
  );
}
