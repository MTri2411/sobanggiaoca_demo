import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'export',
  trailingSlash: true,
  productionBrowserSourceMaps: true,
  allowedDevOrigins: ['192.168.1.40', 'localhost'],
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
