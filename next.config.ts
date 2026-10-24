import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone',
  // Dev server kedua (preview chat lain) butuh folder build sendiri; Next 16 menolak 2 `next dev` di distDir yang sama.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  basePath: '/can-freelance',
  turbopack: {
    root: path.resolve('.'),
  },
  async redirects() {
    return [
      {
        source: '/',
        destination: '/can-freelance',
        basePath: false,
        permanent: false,
      },
    ];
  },
};

export default nextConfig;

