'use client'

import { Compass, Gauge, MapPin, Rocket, Navigation, Globe } from 'lucide-react'

interface PhotoHUDProps {
  position: { x: number; y: number; z: number }
  speed: number
  mode: string
}

// Convert ECEF (Earth-Centered Earth-Fixed) coordinates to lat/lng/alt
function ecefToLatLngAlt(x: number, y: number, z: number) {
  // WGS84 ellipsoid parameters
  const a = 6378137.0 // semi-major axis
  const e2 = 0.00669437999014 // eccentricity squared

  const p = Math.sqrt(x * x + y * y)
  const lng = Math.atan2(y, x) * (180 / Math.PI)

  // Iterative calculation for latitude
  let lat = Math.atan2(z, p * (1 - e2))
  for (let i = 0; i < 5; i++) {
    const sinLat = Math.sin(lat)
    const N = a / Math.sqrt(1 - e2 * sinLat * sinLat)
    lat = Math.atan2(z + e2 * N * sinLat, p)
  }
  const latDeg = lat * (180 / Math.PI)

  // Altitude
  const sinLat = Math.sin(lat)
  const cosLat = Math.cos(lat)
  const N = a / Math.sqrt(1 - e2 * sinLat * sinLat)
  const alt = p / cosLat - N

  return { lat: latDeg, lng, alt: Math.max(0, alt) }
}

export default function PhotoHUD({ position, speed, mode }: PhotoHUDProps) {
  const { lat, lng, alt } = ecefToLatLngAlt(position.x, position.y, position.z)

  // Only show if we have valid coordinates (not at origin)
  const posLen = Math.sqrt(position.x ** 2 + position.y ** 2 + position.z ** 2)
  const hasValidPos = posLen > 1000 // Must be away from origin (Earth radius ~6.3M)

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {/* Top bar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/60 backdrop-blur-sm rounded-full px-6 py-2 border border-cyan-500/30">
        <Rocket className="w-4 h-4 text-cyan-400" />
        <span className="text-cyan-400 font-mono text-sm uppercase tracking-wider">{mode} Mode</span>
        <span className="text-cyan-500/40">|</span>
        <Globe className="w-3.5 h-3.5 text-cyan-400/60" />
        <span className="text-cyan-400/60 font-mono text-xs">Photorealistic 3D</span>
      </div>

      {/* Left panel - Position */}
      {hasValidPos && (
        <div className="absolute top-20 left-4 bg-black/60 backdrop-blur-sm rounded-lg p-4 border border-cyan-500/20 min-w-[220px]">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-4 h-4 text-cyan-400" />
            <span className="text-cyan-400 font-mono text-xs uppercase tracking-wider">Baltimore, MD</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <span className="text-gray-400 font-mono text-xs">LAT</span>
              <span className="text-white font-mono text-xs">{lat.toFixed(5)}°</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 font-mono text-xs">LNG</span>
              <span className="text-white font-mono text-xs">{lng.toFixed(5)}°</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 font-mono text-xs">ALT</span>
              <span className="text-white font-mono text-xs">{alt.toFixed(0)}m</span>
            </div>
          </div>
        </div>
      )}

      {/* Right panel - Speed */}
      <div className="absolute top-20 right-4 bg-black/60 backdrop-blur-sm rounded-lg p-4 border border-cyan-500/20 min-w-[160px]">
        <div className="flex items-center gap-2 mb-3">
          <Gauge className="w-4 h-4 text-cyan-400" />
          <span className="text-cyan-400 font-mono text-xs uppercase tracking-wider">Telemetry</span>
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between">
            <span className="text-gray-400 font-mono text-xs">SPD</span>
            <span className="text-white font-mono text-xs">{speed.toFixed(0)} km/h</span>
          </div>
        </div>
      </div>

      {/* Bottom center - Controls hint */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm rounded-lg px-6 py-3 border border-cyan-500/20">
        <div className="flex items-center gap-2 mb-1">
          <Navigation className="w-3 h-3 text-cyan-400" />
          <span className="text-cyan-400 font-mono text-[10px] uppercase tracking-wider">Controls</span>
        </div>
        <div className="flex gap-4 text-[10px] font-mono text-gray-400">
          <span><kbd className="text-white bg-white/10 px-1 rounded">Left Click + Drag</kbd> Orbit</span>
          <span><kbd className="text-white bg-white/10 px-1 rounded">Right Click + Drag</kbd> Pan</span>
          <span><kbd className="text-white bg-white/10 px-1 rounded">Scroll</kbd> Zoom</span>
        </div>
      </div>

      {/* Compass */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2">
        <Compass className="w-8 h-8 text-cyan-400/60" />
      </div>

      {/* Crosshair */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="w-6 h-6 border border-cyan-400/30 rounded-full flex items-center justify-center">
          <div className="w-1 h-1 bg-cyan-400/60 rounded-full" />
        </div>
      </div>
    </div>
  )
}
