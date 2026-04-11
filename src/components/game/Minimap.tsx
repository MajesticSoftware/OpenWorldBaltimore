'use client'

import { useRef, useEffect, useMemo } from 'react'
import { type BuildingData, type WaterData } from '@/lib/geo-utils'

interface MinimapProps {
  playerPosition: { x: number; y: number; z: number }
  buildings: BuildingData[]
  water: WaterData[]
}

const MINIMAP_SIZE = 180
const MINIMAP_RANGE = 1500 // meters visible in minimap

export default function Minimap({ playerPosition, buildings, water }: MinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Pre-compute building and water centroids for minimap dots
  const buildingPoints = useMemo(() => {
    return buildings.map((b) => {
      const cx = b.outline.reduce((s, p) => s + p.x, 0) / b.outline.length
      const cz = b.outline.reduce((s, p) => s + p.z, 0) / b.outline.length
      return { x: cx, z: cz, height: b.height }
    })
  }, [buildings])

  const waterPoints = useMemo(() => {
    return water.map((w) => {
      const cx = w.outline.reduce((s, p) => s + p.x, 0) / w.outline.length
      const cz = w.outline.reduce((s, p) => s + p.z, 0) / w.outline.length
      return { x: cx, z: cz }
    })
  }, [water])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = MINIMAP_SIZE * dpr
    canvas.height = MINIMAP_SIZE * dpr
    ctx.scale(dpr, dpr)

    // Clear
    ctx.fillStyle = '#0a0a0a'
    ctx.fillRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE)

    const half = MINIMAP_SIZE / 2
    const scale = MINIMAP_SIZE / MINIMAP_RANGE

    // Draw water bodies
    ctx.fillStyle = '#1a3a5c'
    for (const w of waterPoints) {
      const dx = (w.x - playerPosition.x) * scale + half
      const dz = (w.z - playerPosition.z) * scale + half
      if (dx < -10 || dx > MINIMAP_SIZE + 10 || dz < -10 || dz > MINIMAP_SIZE + 10) continue
      ctx.fillRect(dx - 2, dz - 2, 4, 4)
    }

    // Draw buildings
    for (const b of buildingPoints) {
      const dx = (b.x - playerPosition.x) * scale + half
      const dz = (b.z - playerPosition.z) * scale + half
      if (dx < -5 || dx > MINIMAP_SIZE + 5 || dz < -5 || dz > MINIMAP_SIZE + 5) continue

      // Color by height
      if (b.height > 50) {
        ctx.fillStyle = '#6ee7ef'
      } else if (b.height > 20) {
        ctx.fillStyle = '#4a8a8f'
      } else {
        ctx.fillStyle = '#3a5a5a'
      }
      ctx.fillRect(dx - 1, dz - 1, 2, 2)
    }

    // Draw player position (center)
    ctx.fillStyle = '#00d4ff'
    ctx.beginPath()
    ctx.arc(half, half, 4, 0, Math.PI * 2)
    ctx.fill()

    // Draw player direction indicator
    ctx.strokeStyle = '#00d4ff'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(half, half)
    ctx.lineTo(half, half - 12)
    ctx.stroke()

    // Draw border
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.3)'
    ctx.lineWidth = 1
    ctx.strokeRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE)

    // Draw range indicator text
    ctx.fillStyle = 'rgba(0, 212, 255, 0.4)'
    ctx.font = '9px monospace'
    ctx.textAlign = 'right'
    ctx.fillText(`${MINIMAP_RANGE}m`, MINIMAP_SIZE - 4, MINIMAP_SIZE - 4)
  }, [playerPosition, buildingPoints, waterPoints])

  return (
    <div className="absolute bottom-20 left-4 z-10 pointer-events-none">
      <canvas
        ref={canvasRef}
        style={{ width: MINIMAP_SIZE, height: MINIMAP_SIZE }}
        className="rounded-lg opacity-80"
      />
    </div>
  )
}
