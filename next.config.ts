import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone',
  // Dev server kedua (preview chat lain) butuh folder build sendiri; Next 16 menolak 2 `next dev` di distDir yang sama.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // Sejak 2026-11-14 app dilayani di root portal.fatchurbeny.com (dulu basePath '/can-freelance').
  turbopack: {
    root: path.resolve('.'),
  },
  async redirects() {
    return [
      // Tautan & callback OAuth lama di bawah /can-freelance → root. 308 menjaga metode POST (extension Canva Insights).
      { source: '/can-freelance', destination: '/', permanent: true },
      { source: '/can-freelance/:path*', destination: '/:path*', permanent: true },
    ];
  },
};

export default nextConfig;

