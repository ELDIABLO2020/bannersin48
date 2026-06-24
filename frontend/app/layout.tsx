import type { Metadata, Viewport } from "next";
import { Bebas_Neue, Open_Sans } from "next/font/google";
import { Providers } from "./providers";
import { TopNav } from "@/components/nav/TopNav";
import { BottomTabBar } from "@/components/nav/BottomTabBar";
import { AnnouncementStrip } from "@/components/nav/AnnouncementStrip";
import { Footer } from "@/components/home/Footer";
import { CountdownFloatingIsland } from "@/components/nav/CountdownFloatingIsland";
import { CartDrawer } from "@/components/cart/CartDrawer";
import "./globals.css";

const openSans = Open_Sans({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "700"],
  variable: "--font-open-sans",
  preload: true,
});

const bebasNeue = Bebas_Neue({
  subsets: ["latin"],
  display: "swap",
  weight: "400",
  variable: "--font-bebas-neue",
  preload: true,
});

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
    statusBarStyle: "default",
    title: "Banners In 48",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "var(--color-bg-lightest)",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${openSans.variable} ${bebasNeue.variable}`}>
      <body className="min-h-screen flex flex-col font-body">
        <Providers>
          <AnnouncementStrip />
          <TopNav />
          <main className="flex-1">{children}</main>
          <Footer />
          <BottomTabBar />
          <CountdownFloatingIsland />
          <CartDrawer />
        </Providers>
      </body>
    </html>
  );
}
