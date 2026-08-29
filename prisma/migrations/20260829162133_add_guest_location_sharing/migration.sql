-- AlterTable
ALTER TABLE "WeddingGuest" ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "locationSharingEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "locationUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "longitude" DOUBLE PRECISION;

-- CreateIndex
CREATE INDEX "WeddingGuest_weddingId_locationSharingEnabled_idx" ON "WeddingGuest"("weddingId", "locationSharingEnabled");

