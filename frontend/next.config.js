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
module.exports = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  cacheOnNavigation: true,
  reloadOnOnline: true,
})(nextConfig);
