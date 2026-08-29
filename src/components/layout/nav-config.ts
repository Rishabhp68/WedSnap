import { Camera, Heart, Home, MapPin, MessageCircle } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: typeof Home;
}

/**
 * Shared between the mobile bottom bar and the desktop sidebar so the two
 * never drift apart. "Create" sits third of five so it lands dead centre —
 * the bottom nav renders it as a raised button (see AppShell).
 *
 * Profile is deliberately absent: it lives in the top bar's avatar instead.
 */
export const NAV_ITEMS: NavItem[] = [
  { href: "/app", label: "Home", icon: Home },
  { href: "/app/wedding", label: "Wedding", icon: Heart },
  { href: "/app/camera", label: "Create", icon: Camera },
  { href: "/app/chat", label: "Chat", icon: MessageCircle },
  { href: "/app/map", label: "Map", icon: MapPin },
];
