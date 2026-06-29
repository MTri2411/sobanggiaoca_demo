import type { NextConfig } from "next";

const repo = "sobanggiaoca_demo";
const isGithubPages = process.env.GITHUB_PAGES === "true";
const basePath = isGithubPages ? `/${repo}` : "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  assetPrefix: basePath ? `${basePath}/` : undefined,
  trailingSlash: true,
  productionBrowserSourceMaps: true,
  allowedDevOrigins: ["192.168.1.40", "localhost"],
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
