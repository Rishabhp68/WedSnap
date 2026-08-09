import { requireGuest } from "@/lib/auth/current-guest";
import { CameraCapture } from "@/components/social/camera-capture";

export default async function CameraPage() {
  await requireGuest();
  return <CameraCapture />;
}
