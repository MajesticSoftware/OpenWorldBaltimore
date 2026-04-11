'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function Sky() {
  const sunRef = useRef<THREE.DirectionalLight>(null)

  useFrame(({ clock }) => {
    if (sunRef.current) {
      const t = clock.getElapsedTime() * 0.01
      sunRef.current.position.set(
        Math.cos(t) * 2000,
        800 + Math.sin(t) * 200,
        Math.sin(t) * 2000
      )
    }
  })

  return (
    <>
      {/* Ambient light for base illumination */}
      <ambientLight intensity={0.4} color="#8ec8f0" />

      {/* Main sun directional light */}
      <directionalLight
        ref={sunRef}
        intensity={1.8}
        color="#fff5e6"
        position={[1000, 800, 500]}
        castShadow
        shadow-mapSize-width={4096}
        shadow-mapSize-height={4096}
        shadow-camera-far={5000}
        shadow-camera-left={-2000}
        shadow-camera-right={2000}
        shadow-camera-top={2000}
        shadow-camera-bottom={-2000}
        shadow-bias={-0.0001}
      />

      {/* Fill light from opposite side */}
      <directionalLight
        intensity={0.3}
        color="#a0c4ff"
        position={[-500, 400, -300]}
      />

      {/* Hemisphere light for sky/ground color blend */}
      <hemisphereLight
        args={['#87ceeb', '#3a3a32', 0.6]}
      />

      {/* Fog for distance fade */}
      <fog attach="fog" args={['#c8d8e8', 500, 4000]} />

      {/* Sky dome */}
      <mesh>
        <sphereGeometry args={[4500, 32, 16]} />
        <meshBasicMaterial color="#87ceeb" side={THREE.BackSide} />
      </mesh>
    </>
  )
}
