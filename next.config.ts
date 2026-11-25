import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone',
  // Dev server kedua (preview chat lain) butuh folder build sendiri; Next 16 menolak 2 `next dev` di distDir yang sama.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // App dilayani di root domain (sejak 2026-11-14; dulu basePath '/can-freelance'). Domain kini portal.meetimpro.site;
  // portal.fatchurbeny.com dialihkan 308 oleh Nginx (bukan di sini), lihat docs/knowledge/domain-migration-meetimpro.md.
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

