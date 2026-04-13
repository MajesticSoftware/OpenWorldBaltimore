import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: false,
  // CesiumScene.tsx uses `import type` for cesium — no runtime cesium import exists.
  // Cesium.js is loaded via <Script> tag in play/page.tsx and accessed as window.Cesium.
  // Nothing in webpack/Turbopack needs to process the cesium package at all.
  serverExternalPackages: ['cesium'],
  env: {
    CESIUM_BASE_URL: "/cesium",
  },
};

export default nextConfig;
