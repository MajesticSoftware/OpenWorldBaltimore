'use client'

import { useMemo } from 'react'
import * as THREE from 'three'
import { type ParkData } from '@/lib/geo-utils'

interface ParksProps {
  parks: ParkData[]
}

export default function Parks({ parks }: ParksProps) {
  const geometry = useMemo(() => {
    if (!parks.length) return null

    const geometries: THREE.BufferGeometry[] = []

    for (const park of parks) {
      if (park.outline.length < 3) continue

      try {
        const shape = new THREE.Shape()
        shape.moveTo(park.outline[0].x, park.outline[0].z)
        for (let i = 1; i < park.outline.length; i++) {
          shape.lineTo(park.outline[i].x, park.outline[i].z)
        }
        shape.closePath()

        const geo = new THREE.ShapeGeometry(shape)
        geo.rotateX(-Math.PI / 2)
        geo.translate(0, 0.02, 0)
        geometries.push(geo)
      } catch {
        continue
      }
    }

    if (geometries.length === 0) return null
    return mergeGeometries(geometries)
  }, [parks])

  if (!geometry) return null

  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial
        color="#2d5a27"
        roughness={0.9}
        metalness={0.0}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

function mergeGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
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
