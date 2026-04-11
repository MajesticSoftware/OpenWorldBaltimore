'use client'

import { Compass, Gauge, MapPin, Rocket, Navigation } from 'lucide-react'
import { BALTIMORE_CENTER, LAT_TO_METERS, LNG_TO_METERS } from '@/lib/constants'

interface HUDProps {
  position: { x: number; y: number; z: number }
  speed: number
  mode: string
}

export default function HUD({ position, speed, mode }: HUDProps) {
  // Convert local coordinates back to lat/lng for display
  const lat = BALTIMORE_CENTER.lat + (-position.z / LAT_TO_METERS)
  const lng = BALTIMORE_CENTER.lng + (position.x / LNG_TO_METERS)
  const altitude = Math.max(0, position.y).toFixed(1)

  // Cardinal direction from camera rotation (simplified)
  const getCardinal = () => {
    const angle = Math.atan2(position.x, position.z)
    const deg = ((angle * 180) / Math.PI + 360) % 360
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
    return dirs[Math.round(deg / 45) % 8]
  }

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {/* Top bar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/60 backdrop-blur-sm rounded-full px-6 py-2 border border-cyan-500/30">
        <Rocket className="w-4 h-4 text-cyan-400" />
        <span className="text-cyan-400 font-mono text-sm uppercase tracking-wider">{mode} Mode</span>
      </div>

      {/* Left panel - Position */}
      <div className="absolute top-20 left-4 bg-black/60 backdrop-blur-sm rounded-lg p-4 border border-cyan-500/20 min-w-[200px]">
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="w-4 h-4 text-cyan-400" />
          <span className="text-cyan-400 font-mono text-xs uppercase tracking-wider">Position</span>
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
            <span className="text-white font-mono text-xs">{altitude}m</span>
          </div>
        </div>
      </div>

      {/* Right panel - Speed & Compass */}
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
          <div className="flex justify-between">
            <span className="text-gray-400 font-mono text-xs">HDG</span>
            <span className="text-white font-mono text-xs">{getCardinal()}</span>
          </div>
        </div>
      </div>

      {/* Bottom center - Controls hint */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm rounded-lg px-6 py-3 border border-cyan-500/20">
        <div className="flex items-center gap-2 mb-1">
          <Navigation className="w-3 h-3 text-cyan-400" />
          <span className="text-cyan-400 font-mono text-[10px] uppercase tracking-wider">Controls</span>
        </div>
        <div className="flex gap-4 text-[10px] font-mono text-gray-400">
          <span><kbd className="text-white bg-white/10 px-1 rounded">WASD</kbd> Move</span>
          <span><kbd className="text-white bg-white/10 px-1 rounded">Mouse</kbd> Look</span>
          <span><kbd className="text-white bg-white/10 px-1 rounded">Space</kbd> Up</span>
          <span><kbd className="text-white bg-white/10 px-1 rounded">C</kbd> Down</span>
          <span><kbd className="text-white bg-white/10 px-1 rounded">Shift</kbd> Boost</span>
          <span><kbd className="text-white bg-white/10 px-1 rounded">Q/E</kbd> Roll</span>
        </div>
      </div>

      {/* Compass */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2">
        <Compass className="w-8 h-8 text-cyan-400/60" />
      </div>

      {/* Crosshair */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="w-6 h-6 border border-cyan-400/40 rounded-full flex items-center justify-center">
          <div className="w-1 h-1 bg-cyan-400/80 rounded-full" />
        </div>
      </div>
    </div>
  )
}
