import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const now = new Date();
  return [
    { url: `${base}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/order/vinyl`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/order/retractable`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/how-it-works`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/help`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];
}
