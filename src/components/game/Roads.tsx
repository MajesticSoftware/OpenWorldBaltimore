'use client'

import { useMemo } from 'react'
import * as THREE from 'three'
import { type RoadData } from '@/lib/geo-utils'

interface RoadsProps {
  roads: RoadData[]
}

export default function Roads({ roads }: RoadsProps) {
  const geometry = useMemo(() => {
    if (!roads.length) return null

    const geometries: THREE.BufferGeometry[] = []

    for (const road of roads) {
      if (road.points.length < 2) continue

      try {
        // Create a path from road points
        const points: THREE.Vector3[] = road.points.map(
          (p) => new THREE.Vector3(p.x, 0.05, p.z)
        )

        // Create a tube-like flat road using BufferGeometry
        const halfWidth = road.width / 2

        for (let i = 0; i < points.length - 1; i++) {
          const curr = points[i]
          const next = points[i + 1]

          const dir = new THREE.Vector3().subVectors(next, curr).normalize()
          const perp = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(halfWidth)

          const verts = new Float32Array([
            curr.x - perp.x, 0.05, curr.z - perp.z,
            curr.x + perp.x, 0.05, curr.z + perp.z,
            next.x + perp.x, 0.05, next.z + perp.z,
            next.x - perp.x, 0.05, next.z - perp.z,
          ])

          const idx = new Uint16Array([0, 1, 2, 0, 2, 3])

          const segGeo = new THREE.BufferGeometry()
          segGeo.setAttribute('position', new THREE.BufferAttribute(verts, 3))
          segGeo.setIndex(new THREE.BufferAttribute(idx, 1))
          segGeo.computeVertexNormals()
          geometries.push(segGeo)
        }
      } catch {
        continue
      }
    }

    if (geometries.length === 0) return null

    // Merge all road segments
    return mergeRoadGeometries(geometries)
  }, [roads])

  if (!geometry) return null

  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial
        color="#2c2c2c"
        roughness={0.95}
        metalness={0.0}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

function mergeRoadGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
  let totalVerts = 0
  let totalIdx = 0

  for (const g of geometries) {
    totalVerts += g.attributes.position.count * 3
    totalIdx += g.index ? g.index.count : g.attributes.position.count
  }

  const positions = new Float32Array(totalVerts)
  const indices = new Uint32Array(totalIdx)
  let posOff = 0
  let idxOff = 0
  let vertOff = 0

  for (const g of geometries) {
    const posArr = g.attributes.position.array as Float32Array
    positions.set(posArr, posOff)
    posOff += posArr.length

    if (g.index) {
      for (let i = 0; i < g.index.count; i++) {
        indices[idxOff + i] = g.index.array[i] + vertOff
      }
      idxOff += g.index.count
    } else {
      for (let i = 0; i < g.attributes.position.count; i++) {
        indices[idxOff + i] = vertOff + i
      }
      idxOff += g.attributes.position.count
    }
    vertOff += g.attributes.position.count
    g.dispose()
  }

  const merged = new THREE.BufferGeometry()
  merged.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  merged.setIndex(new THREE.BufferAttribute(indices, 1))
  merged.computeVertexNormals()
  return merged
}
