import type { Metadata, Viewport } from "next";
import { Providers } from "./providers";
import { TopNav } from "@/components/nav/TopNav";
import { BottomTabBar } from "@/components/nav/BottomTabBar";
import { AnnouncementStrip } from "@/components/nav/AnnouncementStrip";
import { Footer } from "@/components/home/Footer";
import { CountdownFloatingIsland } from "@/components/nav/CountdownFloatingIsland";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "Banners In 48 — Custom Banners Delivered in 48 Business Hours",
    template: "%s | Banners In 48",
  },
  description:
    "Order custom vinyl and retractable banners online. $4/sq ft. $10 flat shipping. Delivered by noon in 48 business hours. Order by 9 PM ET.",
  keywords: [
    "custom banners",
    "vinyl banners",
    "retractable banners",
    "48 hour banner delivery",
    "fast custom banners",
    "BannersIn48",
  ],
  authors: [{ name: "Banners In 48" }],
  openGraph: {
    type: "website",
    siteName: "Banners In 48",
    title: "Banners In 48 — Custom Banners Delivered in 48 Business Hours",
    description:
      "Order custom vinyl and retractable banners. $4/sq ft. $10 flat shipping. Delivered by noon in 48 business hours.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Banners In 48",
    description: "Custom banners delivered in 48 business hours.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Banners In 48",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "var(--color-bg-navy-base)",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <Providers>
          <AnnouncementStrip />
          <TopNav />
          <main className="flex-1">{children}</main>
          <Footer />
          <BottomTabBar />
          <CountdownFloatingIsland />
        </Providers>
      </body>
    </html>
  );
}
