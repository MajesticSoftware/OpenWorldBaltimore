'use client'

import { useMemo } from 'react'
import * as THREE from 'three'
import { type BuildingData } from '@/lib/geo-utils'

interface BuildingsProps {
  buildings: BuildingData[]
}

// Color palette for buildings based on type
function getBuildingColor(type: string, height: number): THREE.Color {
  // Taller buildings get a more bluish/glass tint
  if (height > 80) return new THREE.Color(0.55, 0.65, 0.75)
  if (height > 50) return new THREE.Color(0.6, 0.65, 0.7)
  if (height > 30) return new THREE.Color(0.65, 0.67, 0.68)

  const typeColors: Record<string, THREE.Color> = {
    commercial: new THREE.Color(0.7, 0.72, 0.74),
    office: new THREE.Color(0.65, 0.68, 0.72),
    industrial: new THREE.Color(0.6, 0.58, 0.55),
    residential: new THREE.Color(0.75, 0.7, 0.65),
    house: new THREE.Color(0.78, 0.72, 0.66),
    apartments: new THREE.Color(0.72, 0.68, 0.64),
    retail: new THREE.Color(0.73, 0.71, 0.68),
    church: new THREE.Color(0.8, 0.78, 0.75),
    hospital: new THREE.Color(0.8, 0.82, 0.84),
    school: new THREE.Color(0.76, 0.74, 0.7),
    hotel: new THREE.Color(0.68, 0.7, 0.74),
    warehouse: new THREE.Color(0.6, 0.58, 0.56),
    garage: new THREE.Color(0.58, 0.56, 0.54),
  }

  return typeColors[type] || new THREE.Color(0.72, 0.7, 0.68)
}

export default function Buildings({ buildings }: BuildingsProps) {
  const mergedGeometry = useMemo(() => {
    if (!buildings.length) return null

    const geometries: THREE.BufferGeometry[] = []
    const colors: number[] = []

    for (const building of buildings) {
      if (building.outline.length < 3) continue

      try {
        // Create 2D shape from outline
        const shape = new THREE.Shape()
        shape.moveTo(building.outline[0].x, building.outline[0].z)
        for (let i = 1; i < building.outline.length; i++) {
          shape.lineTo(building.outline[i].x, building.outline[i].z)
        }
        shape.closePath()

        // Add holes
        for (const hole of building.holes) {
          if (hole.length < 3) continue
          const holePath = new THREE.Path()
          holePath.moveTo(hole[0].x, hole[0].z)
          for (let i = 1; i < hole.length; i++) {
            holePath.lineTo(hole[i].x, hole[i].z)
          }
          holePath.closePath()
          shape.holes.push(holePath)
        }

        // Extrude to building height
        const extrudeSettings: THREE.ExtrudeGeometryOptions = {
          depth: building.height,
          bevelEnabled: false,
          steps: 1,
        }

        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings)

        // Rotate so extrusion goes upward (Y axis)
        geometry.rotateX(-Math.PI / 2)

        // Add vertex colors
        const color = getBuildingColor(building.type, building.height)
        // Slight random variation for visual interest
        const variation = (Math.random() - 0.5) * 0.06
        const r = Math.max(0, Math.min(1, color.r + variation))
        const g = Math.max(0, Math.min(1, color.g + variation))
        const b = Math.max(0, Math.min(1, color.b + variation))

        const posCount = geometry.attributes.position.count
        for (let i = 0; i < posCount; i++) {
          colors.push(r, g, b)
        }

        geometries.push(geometry)
      } catch {
        // Skip malformed buildings
        continue
      }
    }

    if (geometries.length === 0) return null

    // Merge all building geometries into one for performance
    const merged = mergeGeometries(geometries)
    if (!merged) return null

    // Apply vertex colors
    const colorAttr = new THREE.Float32BufferAttribute(colors, 3)
    merged.setAttribute('color', colorAttr)
    merged.computeVertexNormals()

    // Dispose individual geometries
    for (const g of geometries) g.dispose()

    return merged
  }, [buildings])

  if (!mergedGeometry) return null

  return (
    <mesh geometry={mergedGeometry}>
      <meshStandardMaterial
        vertexColors
        roughness={0.7}
        metalness={0.15}
        side={THREE.DoubleSide}
        envMapIntensity={0.8}
      />
    </mesh>
  )
}

// Simple geometry merger
function mergeGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry | null {
  if (geometries.length === 0) return null

  let totalPositions = 0
  let totalNormals = 0
  let totalIndices = 0

  for (const g of geometries) {
    totalPositions += g.attributes.position.count * 3
    if (g.attributes.normal) totalNormals += g.attributes.normal.count * 3
    if (g.index) totalIndices += g.index.count
    else totalIndices += g.attributes.position.count
  }

  const positions = new Float32Array(totalPositions)
  const normals = new Float32Array(totalNormals)
  const indices = new Uint32Array(totalIndices)

  let posOffset = 0
  let normOffset = 0
  let idxOffset = 0
  let vertexOffset = 0

  for (const g of geometries) {
    const posArr = g.attributes.position.array as Float32Array
    positions.set(posArr, posOffset)
    posOffset += posArr.length

    if (g.attributes.normal) {
      const normArr = g.attributes.normal.array as Float32Array
      normals.set(normArr, normOffset)
      normOffset += normArr.length
    }

    if (g.index) {
      const idxArr = g.index.array
      for (let i = 0; i < idxArr.length; i++) {
        indices[idxOffset + i] = idxArr[i] + vertexOffset
      }
      idxOffset += idxArr.length
    } else {
      const count = g.attributes.position.count
      for (let i = 0; i < count; i++) {
        indices[idxOffset + i] = vertexOffset + i
      }
      idxOffset += count
    }

    vertexOffset += g.attributes.position.count
  }

  const merged = new THREE.BufferGeometry()
  merged.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  if (totalNormals > 0) {
    merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3))
  }
  merged.setIndex(new THREE.BufferAttribute(indices, 1))

  return merged
}
