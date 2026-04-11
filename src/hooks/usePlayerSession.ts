'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useUser } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase'

interface SessionData {
  maxAltitude: number
  maxSpeed: number
  distanceTraveled: number
}

export function usePlayerSession() {
  const { user, isSignedIn } = useUser()
  const sessionIdRef = useRef<string | null>(null)
  const playerIdRef = useRef<string | null>(null)
  const sessionDataRef = useRef<SessionData>({
    maxAltitude: 0,
    maxSpeed: 0,
    distanceTraveled: 0,
  })
  const lastPositionRef = useRef<{ x: number; y: number; z: number } | null>(null)
  const startTimeRef = useRef<number>(Date.now())

  // Initialize or get player profile
  useEffect(() => {
    if (!isSignedIn || !user) return

    async function initPlayer() {
      try {
        // Check if player exists
        const { data: existing } = await supabase
          .from('owb_players')
          .select('id')
          .eq('clerk_user_id', user!.id)
          .single()

        if (existing) {
          playerIdRef.current = existing.id
        } else {
          // Create new player
          const { data: newPlayer } = await supabase
            .from('owb_players')
            .insert({
              clerk_user_id: user!.id,
              display_name: user!.firstName || user!.username || 'Pilot',
            })
            .select('id')
            .single()

          if (newPlayer) {
            playerIdRef.current = newPlayer.id
          }
        }

        // Start a new session
        if (playerIdRef.current) {
          const { data: session } = await supabase
            .from('owb_sessions')
            .insert({
              player_id: playerIdRef.current,
              vehicle_mode: 'spaceship',
            })
            .select('id')
            .single()

          if (session) {
            sessionIdRef.current = session.id
            startTimeRef.current = Date.now()
          }
        }
      } catch (err) {
        console.warn('Failed to init player session:', err)
      }
    }

    initPlayer()

    // End session on unmount
    return () => {
      if (sessionIdRef.current) {
        const duration = Math.floor((Date.now() - startTimeRef.current) / 1000)
        supabase
          .from('owb_sessions')
          .update({
            ended_at: new Date().toISOString(),
            duration_seconds: duration,
            max_altitude: sessionDataRef.current.maxAltitude,
            max_speed: sessionDataRef.current.maxSpeed,
            distance_traveled: sessionDataRef.current.distanceTraveled,
          })
          .eq('id', sessionIdRef.current)
          .then(() => {})
      }
    }
  }, [isSignedIn, user])

  // Update session telemetry
  const updateTelemetry = useCallback(
    (position: { x: number; y: number; z: number }, speed: number) => {
      // Track max altitude
      if (position.y > sessionDataRef.current.maxAltitude) {
        sessionDataRef.current.maxAltitude = position.y
      }

      // Track max speed
      if (speed > sessionDataRef.current.maxSpeed) {
        sessionDataRef.current.maxSpeed = speed
      }

      // Track distance traveled
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

  return { updateTelemetry, isSignedIn }
}
