-- AlterTable
ALTER TABLE "WeddingGuest" ALTER COLUMN "locationSharingEnabled" SET DEFAULT true;

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: changing the column default only affects rows inserted from now
-- on, so existing guests would have stayed opted out and the map would stay
-- empty for everyone already invited. Applied because the app has not been
-- released yet; on a live guest list this would be overriding a choice people
-- had already made, and should be dropped instead.
UPDATE "WeddingGuest" SET "locationSharingEnabled" = true WHERE "locationSharingEnabled" = false;
