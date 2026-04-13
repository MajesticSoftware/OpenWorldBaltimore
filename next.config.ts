import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: false,
  turbopack: {
    resolveAlias: {
      // Point cesium imports to the pre-built ESM bundle to avoid
      // Turbopack processing Cesium source files (which contain octal escapes)
      cesium: 'cesium/Build/Cesium/Cesium.js',
    },
  },
  serverExternalPackages: ['cesium'],
  env: {
    CESIUM_BASE_URL: "/cesium",
  },
};

export default nextConfig;
