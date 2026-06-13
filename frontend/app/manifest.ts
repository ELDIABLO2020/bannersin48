import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Banners In 48",
    short_name: "BannersIn48",
    description: "Custom banners delivered in 48 business hours.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#13191E",
    theme_color: "#13191E",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
