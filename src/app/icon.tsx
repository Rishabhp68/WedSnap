import { renderMonogramIcon } from "@/lib/branding/monogram";

// Browser tab / bookmark icon.
export const size = { width: 96, height: 96 };
export const contentType = "image/png";

export default function Icon() {
  return renderMonogramIcon(96);
}
