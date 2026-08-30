import type { MetadataRoute } from "next";
import { isInternalManualCommerce } from "@/lib/config/commerce-mode";

export default function sitemap(): MetadataRoute.Sitemap {
  if (isInternalManualCommerce) return [];

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  // Stable content-modification date rather than request time, so crawlers see
  // a meaningful lastModified and re-crawl only when content actually changes.
  const lastModified = new Date("2026-08-23");
  return [
    { url: `${base}/`, lastModified, changeFrequency: "daily", priority: 1 },
    { url: `${base}/order`, lastModified, changeFrequency: "weekly", priority: 0.95 },
    { url: `${base}/order/hd-banner`, lastModified, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/order/hdpe`, lastModified, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/order/canvas`, lastModified, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/order/mesh`, lastModified, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/order/poster`, lastModified, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/order/no-curl`, lastModified, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/order/econostand`, lastModified, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/order/retractable`, lastModified, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/sizes`, lastModified, changeFrequency: "weekly", priority: 0.85 },
    { url: `${base}/how-it-works`, lastModified, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/help`, lastModified, changeFrequency: "monthly", priority: 0.5 },
  ];
}
