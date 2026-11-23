import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Keep recently visited pages in the browser's router cache, so switching tabs
    // or going back is instant. Any change (server action) still refreshes them.
    staleTimes: { dynamic: 30, static: 180 },
  },
};

export default nextConfig;
