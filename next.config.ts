import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: false,
  // CesiumScene.tsx uses `import type` for cesium — no runtime cesium import exists.
  // Cesium.js is loaded via <Script> tag in play/page.tsx and accessed as window.Cesium.
  // Nothing in webpack/Turbopack needs to process the cesium package at all.
  serverExternalPackages: ['cesium'],
  // CESIUM_BASE_URL is set at runtime via window.CESIUM_BASE_URL in play/page.tsx onLoad.
  // The env block here was unused — removed to avoid confusion.
};

export default nextConfig;
