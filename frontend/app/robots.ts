import type { MetadataRoute } from "next";
import { isInternalManualCommerce } from "@/lib/config/commerce-mode";

export default function robots(): MetadataRoute.Robots {
  if (isInternalManualCommerce) {
    return {
      rules: { userAgent: "*", disallow: "/" },
    };
  }

  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/admin/"] },
    sitemap: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/sitemap.xml`,
  };
}
