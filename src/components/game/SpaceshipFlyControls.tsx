'use client'

import { useRef, useEffect, useCallback, useMemo } from 'react'
import { useFrame, useThree, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

const MOVE_SPEED = 480
const BOOST_MULTIPLIER = 4
const DAMPING = 0.92
const CAMERA_DISTANCE = 150
const CAMERA_HEIGHT = 50
const CAMERA_LERP = 0.06
const MOUSE_ORBIT_SPEED = 0.005

interface SpaceshipFlyControlsProps {
  enabled: boolean
  onPositionUpdate?: (position: THREE.Vector3, rotation: THREE.Euler, speed: number) => void
}

export default function SpaceshipFlyControls({ enabled, onPositionUpdate }: SpaceshipFlyControlsProps) {
  const { camera, gl } = useThree()
  const keysRef = useRef<Set<string>>(new Set())
  const velocityRef = useRef(new THREE.Vector3())
  const speedRef = useRef(0)
  const shipRef = useRef<THREE.Group>(null)
  const ufoPositionRef = useRef(new THREE.Vector3())
  const ufoQuaternionRef = useRef(new THREE.Quaternion())
  const orbitAngleRef = useRef({ theta: 0, phi: 0.3 })
  const isDraggingRef = useRef(false)
  const initedRef = useRef(false)
  const gltf = useLoader(GLTFLoader, '/ufo/scene.gltf')

  const ufoScene = useMemo(() => {
    const clone = gltf.scene.clone()
    return clone
  }, [gltf])

  // Initialize UFO position from camera
  useEffect(() => {
    if (enabled && !initedRef.current) {
      const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion)
      ufoPositionRef.current.copy(camera.position).add(fwd.multiplyScalar(CAMERA_DISTANCE))
      ufoQuaternionRef.current.copy(camera.quaternion)
      initedRef.current = true
    }
    if (!enabled) {
      initedRef.current = false
    }
  }, [enabled, camera])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return
    keysRef.current.add(e.code)
    if (e.code === 'Space' || e.code === 'KeyC') e.preventDefault()
  }, [enabled])

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    keysRef.current.delete(e.code)
  }, [])

  const handleMouseDown = useCallback((e: MouseEvent) => {
    if (!enabled) return
    if (e.button === 0 || e.button === 2) isDraggingRef.current = true
  }, [enabled])

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false
  }, [])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!enabled || !isDraggingRef.current) return
    orbitAngleRef.current.theta -= e.movementX * MOUSE_ORBIT_SPEED
    orbitAngleRef.current.phi = Math.max(
      -Math.PI / 3,
      Math.min(Math.PI / 2.5, orbitAngleRef.current.phi + e.movementY * MOUSE_ORBIT_SPEED)
    )
  }, [enabled])

  const handleContextMenu = useCallback((e: Event) => {
    if (enabled) e.preventDefault()
  }, [enabled])

  useEffect(() => {
    if (!enabled) {
      keysRef.current.clear()
      velocityRef.current.set(0, 0, 0)
      return
    }

    const el = gl.domElement
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    el.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('mousemove', handleMouseMove)
    el.addEventListener('contextmenu', handleContextMenu)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      el.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('mousemove', handleMouseMove)
      el.removeEventListener('contextmenu', handleContextMenu)
    }
  }, [enabled, gl, handleKeyDown, handleKeyUp, handleMouseDown, handleMouseUp, handleMouseMove, handleContextMenu])

  useFrame((_, delta) => {
    if (!enabled || !shipRef.current) return
    const dt = Math.min(delta, 0.1)
    const keys = keysRef.current
    const boost = keys.has('ShiftLeft') || keys.has('ShiftRight') ? BOOST_MULTIPLIER : 1
    const speed = MOVE_SPEED * boost

    // Get UFO's forward/right based on camera orbit angle (projected to surface tangent)
    const camForward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion)
    camForward.y = 0
    if (camForward.lengthSq() < 0.001) camForward.set(0, 0, -1)
    camForward.normalize()
    const camRight = new THREE.Vector3().crossVectors(camForward, new THREE.Vector3(0, 1, 0)).normalize()

    // UFO "up" = away from Earth center (normalize position)
    const ufoUp = ufoPositionRef.current.clone().normalize()

    // Movement in camera-relative directions projected onto the sphere surface
    const moveDir = new THREE.Vector3()
    if (keys.has('KeyW') || keys.has('ArrowUp')) moveDir.add(camForward)
    if (keys.has('KeyS') || keys.has('ArrowDown')) moveDir.sub(camForward)
    if (keys.has('KeyA') || keys.has('ArrowLeft')) moveDir.sub(camRight)
    if (keys.has('KeyD') || keys.has('ArrowRight')) moveDir.add(camRight)
    if (keys.has('Space')) moveDir.add(ufoUp)
    if (keys.has('KeyC')) moveDir.sub(ufoUp)

    if (moveDir.lengthSq() > 0) {
      moveDir.normalize()
      velocityRef.current.add(moveDir.multiplyScalar(speed * dt))
    }

    // Q/E rotate the camera orbit around the UFO
    if (keys.has('KeyQ')) orbitAngleRef.current.theta += 2.0 * dt
    if (keys.has('KeyE')) orbitAngleRef.current.theta -= 2.0 * dt

    velocityRef.current.multiplyScalar(DAMPING)
    ufoPositionRef.current.add(velocityRef.current.clone().multiplyScalar(dt))

    // Rotate UFO to face movement direction
    if (velocityRef.current.lengthSq() > 0.1) {
      const vel = velocityRef.current.clone()
      // Project velocity onto surface plane (remove radial component)
      const radial = ufoUp.clone().multiplyScalar(vel.dot(ufoUp))
      const surfaceVel = vel.clone().sub(radial)
      if (surfaceVel.lengthSq() > 0.01) {
        const targetDir = surfaceVel.normalize()
        const targetQuat = new THREE.Quaternion()
        const lookMatrix = new THREE.Matrix4().lookAt(new THREE.Vector3(), targetDir, ufoUp)
        targetQuat.setFromRotationMatrix(lookMatrix)
        ufoQuaternionRef.current.slerp(targetQuat, 0.08)
      }
    }

    speedRef.current = velocityRef.current.length() * 3.6

    // Update UFO mesh
    shipRef.current.position.copy(ufoPositionRef.current)
    shipRef.current.quaternion.copy(ufoQuaternionRef.current)

    // Third-person camera: position behind and slightly above the UFO
    // In ECEF, "above" = further from Earth center (along ufoUp)
    // We want camera ABOVE the UFO looking DOWN at city, so offset along ufoUp (away from Earth)
    // and offset horizontally behind using the orbit angle
    const { theta, phi } = orbitAngleRef.current

    // Build a local coordinate frame at the UFO position
    // localUp = radial outward from Earth
    // localNorth/localEast = tangent to surface
    const localUp = ufoUp.clone()
    const localEast = new THREE.Vector3(0, 1, 0).cross(localUp).normalize()
    if (localEast.lengthSq() < 0.001) localEast.set(1, 0, 0)
    const localNorth = localUp.clone().cross(localEast).normalize()

    // Camera orbits around the UFO using local frame
    const horizontalOffset = localEast.clone().multiplyScalar(Math.sin(theta) * CAMERA_DISTANCE)
      .add(localNorth.clone().multiplyScalar(Math.cos(theta) * CAMERA_DISTANCE))
    const verticalOffset = localUp.clone().multiplyScalar(CAMERA_HEIGHT + Math.sin(phi) * CAMERA_DISTANCE * 0.5)

    const targetCamPos = ufoPositionRef.current.clone().add(horizontalOffset).add(verticalOffset)

    camera.position.lerp(targetCamPos, CAMERA_LERP)
    // Set camera up vector to local surface "up" (radial from Earth center)
    // This prevents the camera from flipping upside down in ECEF coordinates
    camera.up.copy(localUp)
    camera.lookAt(ufoPositionRef.current)
    camera.updateMatrixWorld()

    if (onPositionUpdate) {
      onPositionUpdate(ufoPositionRef.current.clone(), camera.rotation.clone(), speedRef.current)
    }
  })

  if (!enabled) return null

  return (
    <group ref={shipRef}>
      {/* Rotate model upright: flip X by PI so top faces outward from Earth */}
      <group rotation={[Math.PI, 0, 0]}>
        <primitive object={ufoScene} scale={[0.12, 0.12, 0.12]} />
      </group>
      <pointLight color="#88ccff" intensity={2} distance={40} position={[0, 1, 0]} />
    </group>
  )
}
