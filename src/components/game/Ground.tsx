'use client'

import * as THREE from 'three'

export default function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
      <planeGeometry args={[6000, 6000, 1, 1]} />
      <meshStandardMaterial
        color="#3a3a32"
        roughness={0.95}
        metalness={0.0}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}
