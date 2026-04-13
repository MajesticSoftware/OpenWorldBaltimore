import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: false,
  turbopack: {
    resolveAlias: {
      // Dev (Turbopack): point cesium to pre-built bundle — avoids Turbopack
      // processing Cesium source files which contain octal escapes
      cesium: 'cesium/Build/Cesium/Cesium.js',
    },
  },
  // Production (webpack): mark cesium as an external global so webpack/Terser
  // never touch the Cesium source. 'import * as Cesium' compiles to window.Cesium.
  // The actual Cesium.js is loaded via <Script> in play/page.tsx.
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : []),
        { cesium: 'Cesium' },
      ]
    }
    return config
  },
  serverExternalPackages: ['cesium'],
  env: {
    CESIUM_BASE_URL: "/cesium",
  },
};

export default nextConfig;
