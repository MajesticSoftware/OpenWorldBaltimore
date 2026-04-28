'use client'

import { useRef, useCallback } from 'react'

interface SessionData {
  maxAltitude: number
  maxSpeed: number
  distanceTraveled: number
}

export function usePlayerSession() {
  const sessionDataRef = useRef<SessionData>({
    maxAltitude: 0,
    maxSpeed: 0,
    distanceTraveled: 0,
  })
  const lastPositionRef = useRef<{ x: number; y: number; z: number } | null>(null)

  // Local telemetry only. Clerk/Supabase session persistence was removed.
  const updateTelemetry = useCallback(
    (position: { x: number; y: number; z: number }, speed: number) => {
      if (position.y > sessionDataRef.current.maxAltitude) {
        sessionDataRef.current.maxAltitude = position.y
      }

      if (speed > sessionDataRef.current.maxSpeed) {
        sessionDataRef.current.maxSpeed = speed
      }

      if (lastPositionRef.current) {
        const dx = position.x - lastPositionRef.current.x
        const dy = position.y - lastPositionRef.current.y
        const dz = position.z - lastPositionRef.current.z
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
        if (dist < 100) {
          sessionDataRef.current.distanceTraveled += dist
        }
      }
      lastPositionRef.current = { ...position }
    },
    []
  )

  return { updateTelemetry, isSignedIn: false }
}
