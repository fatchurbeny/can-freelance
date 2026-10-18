import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone',
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

