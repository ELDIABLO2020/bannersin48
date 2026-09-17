/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Retired routes. Query strings carry over (e.g. /order/vinyl?width=3 keeps its size).
  async redirects() {
    return [
      { source: "/order/vinyl", destination: "/order/hd-banner", permanent: false },
      { source: "/order/artwork", destination: "/order", permanent: false },
      { source: "/faq", destination: "/help", permanent: false },
      { source: "/orders/lookup", destination: "/orders", permanent: false },
      { source: "/orders/:id/proof", destination: "/orders/:id", permanent: false },
    ];
  },
};

const withSerwistInit = require("@serwist/next").default;

// In mock mode MSW's service worker is the sole request controller. Serwist's
// PWA worker uses skipWaiting + clientsClaim, so if both register it steals
// control of the page and mock API requests fall through to the absent backend.
const enableMocks = process.env.NEXT_PUBLIC_ENABLE_MOCKS === "1";

module.exports = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  cacheOnNavigation: true,
  reloadOnOnline: true,
  register: !enableMocks,
})(nextConfig);
