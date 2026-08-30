import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getCurrentWedding } from "@/lib/wedding/current";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const wedding = await getCurrentWedding();
  const names = `${wedding.partnerOneName} & ${wedding.partnerTwoName}`;
  return {
    title: `${names} are getting married`,
    description:
      wedding.tagline ??
      `Join us in celebrating the wedding of ${names} — details, schedule, and a private space to share the moments together.`,
    // The manifest and both icons are generated (app/manifest.ts, app/icon.tsx,
    // app/apple-icon.tsx) and Next links them automatically, so only the iOS
    // web-app flags are declared here. Without `capable`, iOS opens the Home
    // Screen shortcut in a Safari tab — where push notifications don't work.
    appleWebApp: { capable: true, statusBarStyle: "default", title: names },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#fbf7f1",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <ClerkProvider afterSignOutUrl="/">
      <html
        lang="en"
        className={`${inter.variable} ${playfair.variable} h-full antialiased`}
        suppressHydrationWarning
      >
        <body className="min-h-full flex flex-col overflow-x-hidden bg-background text-foreground">
          <TooltipProvider delay={200}>{children}</TooltipProvider>
          <Toaster position="top-center" />
        </body>
      </html>
    </ClerkProvider>
  );
}
