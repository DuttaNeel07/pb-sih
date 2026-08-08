import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: '/sih',
  async redirects() {
    return [
      {
        source: '/',
        destination: '/sih',
        permanent: true,
        basePath: false,
      },
    ];
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Warning: This allows production builds to successfully complete even if
    // your project has TypeScript errors.
    ignoreBuildErrors: true,
  },
  /* config options here */
};

export default nextConfig;
