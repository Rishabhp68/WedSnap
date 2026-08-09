import { Camera, Heart, Home, MessageCircle, User } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: typeof Home;
}

/** Shared between the mobile bottom bar and the desktop sidebar so the two never drift apart. */
export const NAV_ITEMS: NavItem[] = [
  { href: "/app", label: "Home", icon: Home },
  { href: "/app/camera", label: "Create", icon: Camera },
  { href: "/app/chat", label: "Chat", icon: MessageCircle },
  { href: "/app/wedding", label: "Wedding", icon: Heart },
  { href: "/app/profile", label: "Profile", icon: User },
];
