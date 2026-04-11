import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: false,
  turbopack: {},
  env: {
    CESIUM_BASE_URL: "/cesium",
  },
};

export default nextConfig;
