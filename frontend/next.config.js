/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Contract: the canonical API URL is read from the env var. In dev, rewrite
  // /api/* to the backend so the same client code works in both environments.
  async rewrites() {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
    if (!apiBase) return [];
    return [
      {
        source: "/api/:path*",
        destination: `${apiBase.replace(/\/$/, "")}/:path*`,
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
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
