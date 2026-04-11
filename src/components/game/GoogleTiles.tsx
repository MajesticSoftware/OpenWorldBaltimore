'use client'

import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import {
  TilesRenderer as TilesRendererR3F,
  TilesPlugin,
  GlobeControls,
  TilesAttributionOverlay,
} from '3d-tiles-renderer/r3f'
import { GoogleCloudAuthPlugin, TileCompressionPlugin } from '3d-tiles-renderer/plugins'
import SpaceshipFlyControls from './SpaceshipFlyControls'
import RealisticWater from './RealisticWater'

interface GoogleTilesProps {
  apiKey: string
  mode: 'orbit' | 'spaceship'
  waterVisible?: boolean
  onPositionUpdate?: (position: THREE.Vector3, rotation: THREE.Euler, speed: number) => void
}

function OrbitCameraTracker({ enabled, onPositionUpdate }: { enabled: boolean; onPositionUpdate?: GoogleTilesProps['onPositionUpdate'] }) {
  const { camera } = useThree()
  const lastPosRef = useRef(new THREE.Vector3())
  const speedRef = useRef(0)

  useFrame((_, delta) => {
    if (!enabled || !onPositionUpdate) return

    const currentPos = camera.position.clone()
    const dist = currentPos.distanceTo(lastPosRef.current)
    speedRef.current = (dist / Math.max(delta, 0.001)) * 3.6
    lastPosRef.current.copy(currentPos)

    onPositionUpdate(currentPos, camera.rotation.clone(), speedRef.current)
  })

  return null
}

export default function GoogleTiles({ apiKey, mode, waterVisible = true, onPositionUpdate }: GoogleTilesProps) {
  const isOrbit = mode === 'orbit'

  return (
    <>
      <ambientLight intensity={1.5} />
      <directionalLight position={[1, 1, 1]} intensity={2.0} color="#ffffff" />
      <hemisphereLight args={['#87ceeb', '#444444', 0.5]} />

      <TilesRendererR3F
        errorTarget={40}
        maxDepth={25}
        loadSiblings
      >
        {/* @ts-expect-error args type inference issue with single-object constructor */}
        <TilesPlugin plugin={GoogleCloudAuthPlugin} args={{ apiToken: apiKey }} />
        <TilesPlugin plugin={TileCompressionPlugin} />
        {isOrbit && <GlobeControls enableDamping />}
        <TilesAttributionOverlay />
        <RealisticWater visible={waterVisible} />
      </TilesRendererR3F>

      {/* Spaceship free-flight controls */}
      <SpaceshipFlyControls
        enabled={!isOrbit}
        onPositionUpdate={onPositionUpdate}
      />

      {/* Orbit mode camera tracker */}
      <OrbitCameraTracker enabled={isOrbit} onPositionUpdate={onPositionUpdate} />
    </>
  )
}
