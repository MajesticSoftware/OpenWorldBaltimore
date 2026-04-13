import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  reactCompiler: false,
  turbopack: {
    resolveAlias: {
      // Dev: point cesium to pre-built bundle (avoids octal escape in source files)
      cesium: 'cesium/Build/Cesium/Cesium.js',
    },
  },
  // Production: same alias for webpack so next build also skips raw Cesium source
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        cesium: path.resolve('./node_modules/cesium/Build/Cesium/Cesium.js'),
      }
    }
    return config
  },
  serverExternalPackages: ['cesium'],
  env: {
    CESIUM_BASE_URL: "/cesium",
  },
};

export default nextConfig;
