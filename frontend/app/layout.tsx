import type { Metadata, Viewport } from "next";
import { Bebas_Neue, Open_Sans } from "next/font/google";
import { colors } from "@bannersin48/design-tokens";
import { Providers } from "./providers";
import { isInternalManualCommerce } from "@/lib/config/commerce-mode";
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
    "Configure custom vinyl, mesh, poster, canvas, and banner stands for internal platform testing. USA-only orders use USD and manual payment.",
  keywords: [
    "custom banners",
    "vinyl banners",
    "mesh banners",
    "poster printing",
    "canvas prints",
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
      "Configure custom vinyl, mesh, poster, canvas, and banner stands. Internal orders use manual payment.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Banners In 48",
    description: "Custom banners delivered in 48 business hours.",
  },
  robots: {
    index: !isInternalManualCommerce,
    follow: !isInternalManualCommerce,
    noarchive: isInternalManualCommerce,
    googleBot: {
      index: !isInternalManualCommerce,
      follow: !isInternalManualCommerce,
      noarchive: isInternalManualCommerce,
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
  // Must be a literal — CSS custom properties do not resolve in a meta tag.
  themeColor: colors.lightest,
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/**
 * Root layout is intentionally limited to the document shell + providers so
 * that every surface (storefront, admin, account) controls its own chrome.
 * Storefront chrome lives in `(storefront)/layout.tsx`; admin in
 * `admin/layout.tsx`.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${openSans.variable} ${bebasNeue.variable}`}>
      <body className="min-h-screen flex flex-col font-body">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
