'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { type WaterData } from '@/lib/geo-utils'

interface WaterProps {
  waterBodies: WaterData[]
}

export default function Water({ waterBodies }: WaterProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const uniformsRef = useRef({ uTime: { value: 0 } })

  const geometry = useMemo(() => {
    if (waterBodies.length === 0) {
      // Fallback: create a large water plane for Inner Harbor area
      // Inner Harbor approximate dimensions in local coordinates
      const shape = new THREE.Shape()
      // Create a rough shape for the Inner Harbor basin
      shape.moveTo(-300, -200)
      shape.lineTo(300, -200)
      shape.lineTo(350, -100)
      shape.lineTo(350, 400)
      shape.lineTo(-350, 400)
      shape.lineTo(-350, -100)
      shape.closePath()

      const geo = new THREE.ShapeGeometry(shape, 32)
      geo.rotateX(-Math.PI / 2)
      return geo
    }

    // Merge all water body shapes
    const geometries: THREE.BufferGeometry[] = []

    for (const wb of waterBodies) {
      if (wb.outline.length < 3) continue
      try {
        const shape = new THREE.Shape()
        shape.moveTo(wb.outline[0].x, wb.outline[0].z)
        for (let i = 1; i < wb.outline.length; i++) {
          shape.lineTo(wb.outline[i].x, wb.outline[i].z)
        }
        shape.closePath()

        for (const hole of wb.holes) {
          if (hole.length < 3) continue
          const holePath = new THREE.Path()
          holePath.moveTo(hole[0].x, hole[0].z)
          for (let i = 1; i < hole.length; i++) {
            holePath.lineTo(hole[i].x, hole[i].z)
          }
          holePath.closePath()
          shape.holes.push(holePath)
        }

        const geo = new THREE.ShapeGeometry(shape, 16)
        geo.rotateX(-Math.PI / 2)
        geometries.push(geo)
      } catch {
        continue
      }
    }

    if (geometries.length === 0) {
      const plane = new THREE.PlaneGeometry(800, 1200, 64, 64)
      plane.rotateX(-Math.PI / 2)
      return plane
    }

    // Simple merge
    return mergeWaterGeometries(geometries)
  }, [waterBodies])

  // Animate water
  useFrame((_, delta) => {
    uniformsRef.current.uTime.value += delta
    if (meshRef.current) {
      const positions = meshRef.current.geometry.attributes.position
      if (positions) {
        const arr = positions.array as Float32Array
        const time = uniformsRef.current.uTime.value
        for (let i = 0; i < arr.length; i += 3) {
          const x = arr[i]
          const z = arr[i + 2]
          arr[i + 1] = Math.sin(x * 0.02 + time * 0.8) * 0.3 +
                        Math.cos(z * 0.015 + time * 0.6) * 0.2
        }
        positions.needsUpdate = true
      }
    }
  })

  return (
    <mesh ref={meshRef} geometry={geometry} position={[0, 0.1, 0]} receiveShadow>
      <meshPhysicalMaterial
        color="#1a5276"
        transmission={0.3}
        roughness={0.15}
        metalness={0.1}
        ior={1.333}
        transparent
        opacity={0.85}
        envMapIntensity={1.5}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

function mergeWaterGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
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
