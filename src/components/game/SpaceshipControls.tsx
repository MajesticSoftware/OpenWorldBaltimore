'use client'

import { useRef, useEffect, useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

interface SpaceshipControlsProps {
  onPositionUpdate?: (position: THREE.Vector3, rotation: THREE.Euler, speed: number) => void
}

const MOVE_SPEED = 150
const LOOK_SPEED = 0.002
const ROLL_SPEED = 1.5
const BOOST_MULTIPLIER = 3
const DAMPING = 0.92

export default function SpaceshipControls({ onPositionUpdate }: SpaceshipControlsProps) {
  const { camera, gl } = useThree()
  const keysRef = useRef<Set<string>>(new Set())
  const velocityRef = useRef(new THREE.Vector3())
  const mouseRef = useRef({ x: 0, y: 0, locked: false })
  const speedRef = useRef(0)
  const shipRef = useRef<THREE.Group>(null)

  // Set initial camera position (above Inner Harbor looking down)
  useEffect(() => {
    camera.position.set(0, 300, 500)
    camera.lookAt(0, 0, 0)
  }, [camera])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    keysRef.current.add(e.code)
  }, [])

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    keysRef.current.delete(e.code)
  }, [])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (mouseRef.current.locked) {
      mouseRef.current.x = e.movementX
      mouseRef.current.y = e.movementY
    }
  }, [])

  const handleClick = useCallback(() => {
    gl.domElement.requestPointerLock()
  }, [gl])

  const handlePointerLockChange = useCallback(() => {
    mouseRef.current.locked = document.pointerLockElement === gl.domElement
  }, [gl])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('mousemove', handleMouseMove)
    gl.domElement.addEventListener('click', handleClick)
    document.addEventListener('pointerlockchange', handlePointerLockChange)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('mousemove', handleMouseMove)
      gl.domElement.removeEventListener('click', handleClick)
      document.removeEventListener('pointerlockchange', handlePointerLockChange)
    }
  }, [gl, handleKeyDown, handleKeyUp, handleMouseMove, handleClick, handlePointerLockChange])

  useFrame((_, delta) => {
    const keys = keysRef.current
    const dt = Math.min(delta, 0.1)
    const boost = keys.has('ShiftLeft') || keys.has('ShiftRight') ? BOOST_MULTIPLIER : 1
    const speed = MOVE_SPEED * boost

    // Get camera direction vectors
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion)
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion)
    const up = new THREE.Vector3(0, 1, 0)

    // Movement
    const moveDir = new THREE.Vector3()
    if (keys.has('KeyW') || keys.has('ArrowUp')) moveDir.add(forward)
    if (keys.has('KeyS') || keys.has('ArrowDown')) moveDir.sub(forward)
    if (keys.has('KeyA') || keys.has('ArrowLeft')) moveDir.sub(right)
    if (keys.has('KeyD') || keys.has('ArrowRight')) moveDir.add(right)
    if (keys.has('Space')) moveDir.add(up)
    if (keys.has('ControlLeft') || keys.has('KeyC')) moveDir.sub(up)

    if (moveDir.lengthSq() > 0) {
      moveDir.normalize()
      velocityRef.current.add(moveDir.multiplyScalar(speed * dt))
    }

    // Apply damping
    velocityRef.current.multiplyScalar(DAMPING)

    // Apply velocity to position
    camera.position.add(velocityRef.current.clone().multiplyScalar(dt))

    // Mouse look (pitch + yaw)
    if (mouseRef.current.locked) {
      const euler = new THREE.Euler(0, 0, 0, 'YXZ')
      euler.setFromQuaternion(camera.quaternion)

      euler.y -= mouseRef.current.x * LOOK_SPEED
      euler.x -= mouseRef.current.y * LOOK_SPEED
      euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.x))

      camera.quaternion.setFromEuler(euler)

      mouseRef.current.x = 0
      mouseRef.current.y = 0
    }

    // Roll (Q/E)
    if (keys.has('KeyQ')) {
      camera.rotateZ(ROLL_SPEED * dt)
    }
    if (keys.has('KeyE')) {
      camera.rotateZ(-ROLL_SPEED * dt)
    }

    // Track speed for HUD
    speedRef.current = velocityRef.current.length() * 3.6 // Convert to km/h equivalent

    // Update spaceship mesh position to follow camera
    if (shipRef.current) {
      const shipPos = camera.position.clone().add(forward.multiplyScalar(-5))
      shipRef.current.position.copy(shipPos)
      shipRef.current.quaternion.copy(camera.quaternion)
    }

    // Callback for HUD
    if (onPositionUpdate) {
      onPositionUpdate(camera.position.clone(), camera.rotation.clone(), speedRef.current)
    }
  })

  return (
    <group ref={shipRef}>
      {/* Simple spaceship mesh */}
      <mesh castShadow>
        <coneGeometry args={[2, 8, 6]} />
        <meshStandardMaterial color="#00d4ff" emissive="#0066aa" emissiveIntensity={0.5} metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Engine glow */}
      <pointLight color="#00d4ff" intensity={2} distance={30} position={[0, 0, 4]} />
    </group>
  )
}
