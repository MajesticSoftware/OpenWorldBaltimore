'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type * as CesiumType from 'cesium'
import { Loader2, Rocket, Globe, Sun, Moon } from 'lucide-react'

// Cesium is loaded as a plain <script> tag in play/page.tsx (window.Cesium).
// import type erases at compile time — webpack/Terser never touch the Cesium package.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Cesium: typeof CesiumType

// Baltimore Inner Harbor (corrected to center of Inner Harbor promenade)
const BALTIMORE_LAT = 39.2856
const BALTIMORE_LNG = -76.6062
const INITIAL_ALT = 800

type GameMode = 'orbit' | 'spaceship'
type SkyboxOption = 'default' | 'sunset' | 'night' | 'forest' | 'mountain' | 'anime' | 'sky93'

const SKYBOX_OPTIONS: { id: SkyboxOption; label: string; color: string }[] = [
  { id: 'default', label: 'Default', color: 'bg-sky-400' },
  { id: 'sunset', label: 'Sunset', color: 'bg-orange-400' },
  { id: 'night', label: 'Night', color: 'bg-indigo-900' },
  { id: 'forest', label: 'Forest', color: 'bg-emerald-500' },
  { id: 'mountain', label: 'Mountain', color: 'bg-stone-400' },
  { id: 'anime', label: 'Anime', color: 'bg-cyan-400' },
  { id: 'sky93', label: 'Dusk', color: 'bg-blue-700' },
]

// UFO flight state
interface FlightState {
  position: CesiumType.Cartesian3
  heading: number
  pitch: number
  speed: number
}

export default function CesiumScene() {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<CesiumType.Viewer | null>(null)
  const flightRef = useRef<FlightState | null>(null)
  const keysRef = useRef<Set<string>>(new Set())
  const isDraggingRef = useRef(false)
  const lastMouseRef = useRef({ x: 0, y: 0 })
  const ufoEntityRef = useRef<CesiumType.Entity | null>(null)
  const animFrameRef = useRef<number>(0)
  const wobbleTimeRef = useRef<number>(0)
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<GameMode>('orbit')
  const [hudData, setHudData] = useState({ lat: BALTIMORE_LAT, lng: BALTIMORE_LNG, alt: INITIAL_ALT, speed: 0 })
  const [skybox, setSkybox] = useState<SkyboxOption>('default')

  // Generate a gradient cubemap face as a data URL
  const makeGradientFace = useCallback((topHex: string, midHex: string, botHex: string, size = 256) => {
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!
    const grad = ctx.createLinearGradient(0, 0, 0, size)
    grad.addColorStop(0, topHex)
    grad.addColorStop(0.45, midHex)
    grad.addColorStop(0.55, midHex)
    grad.addColorStop(1, botHex)
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, size, size)
    return canvas.toDataURL('image/png')
  }, [])

  // Apply skybox changes
  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer || viewer.isDestroyed()) return

    const scene = viewer.scene

    if (skybox === 'default') {
      if (scene.skyAtmosphere) scene.skyAtmosphere.show = true
      scene.skyBox = new Cesium.SkyBox({
        sources: {
          positiveX: '/cesium/Assets/Textures/SkyBox/tycho2t3_80_px.jpg',
          negativeX: '/cesium/Assets/Textures/SkyBox/tycho2t3_80_mx.jpg',
          positiveY: '/cesium/Assets/Textures/SkyBox/tycho2t3_80_py.jpg',
          negativeY: '/cesium/Assets/Textures/SkyBox/tycho2t3_80_my.jpg',
          positiveZ: '/cesium/Assets/Textures/SkyBox/tycho2t3_80_pz.jpg',
          negativeZ: '/cesium/Assets/Textures/SkyBox/tycho2t3_80_mz.jpg',
        },
      })
      scene.backgroundColor = Cesium.Color.BLACK
      if (scene.sun) scene.sun.show = true
      if (scene.moon) scene.moon.show = true
    } else if (skybox === 'sky93') {
      if (scene.skyAtmosphere) scene.skyAtmosphere.show = false
      if (scene.sun) scene.sun.show = false
      if (scene.moon) scene.moon.show = false
      const dir = '/sky_93_2k/sky_93_cubemap_2k'
      scene.skyBox = new Cesium.SkyBox({
        sources: {
          positiveX: `${dir}/px.png`,
          negativeX: `${dir}/nx.png`,
          positiveY: `${dir}/py.png`,
          negativeY: `${dir}/ny.png`,
          positiveZ: `${dir}/pz.png`,
          negativeZ: `${dir}/nz.png`,
        },
      })
      scene.backgroundColor = Cesium.Color.BLACK
    } else if (skybox === 'forest' || skybox === 'mountain' || skybox === 'anime') {
      // Use pre-split cubemap face images
      if (scene.skyAtmosphere) scene.skyAtmosphere.show = false
      if (scene.sun) scene.sun.show = true
      if (scene.moon) scene.moon.show = false
      const dir = `/skybox-faces/${skybox}`
      scene.skyBox = new Cesium.SkyBox({
        sources: {
          positiveX: `${dir}/px.jpg`,
          negativeX: `${dir}/nx.jpg`,
          positiveY: `${dir}/py.jpg`,
          negativeY: `${dir}/ny.jpg`,
          positiveZ: `${dir}/pz.jpg`,
          negativeZ: `${dir}/nz.jpg`,
        },
      })
      scene.backgroundColor = Cesium.Color.BLACK
    } else {
      // Gradient skyboxes (sunset, night) — use makeGradientFace for square canvas faces
      if (scene.skyAtmosphere) scene.skyAtmosphere.show = false
      if (scene.sun) scene.sun.show = skybox !== 'night'
      if (scene.moon) scene.moon.show = skybox === 'night'

      const gradients: Record<string, [string, string, string]> = {
        sunset: ['#1a0a2e', '#cc5522', '#ffaa44'],
        night: ['#020111', '#0a0a2e', '#050510'],
      }
      const [top, mid, bot] = gradients[skybox] || ['#000', '#333', '#000']
      const face = makeGradientFace(top, mid, bot)
      scene.skyBox = new Cesium.SkyBox({
        sources: {
          positiveX: face, negativeX: face,
          positiveY: face, negativeY: face,
          positiveZ: face, negativeZ: face,
        },
      })
      scene.backgroundColor = Cesium.Color.BLACK
    }
  }, [skybox, makeGradientFace])

  // Initialize CesiumJS viewer
  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return

    Cesium.Ion.defaultAccessToken = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN || ''

    const viewer = new Cesium.Viewer(containerRef.current, {
      globe: false,
      baseLayerPicker: false,
      geocoder: false,
      homeButton: false,
      sceneModePicker: false,
      navigationHelpButton: false,
      animation: false,
      timeline: false,
      fullscreenButton: false,
      vrButton: false,
      infoBox: false,
      selectionIndicator: false,
      skyAtmosphere: new Cesium.SkyAtmosphere(),
      orderIndependentTranslucency: false,
    })

    viewerRef.current = viewer

    // Remove default credit display clutter
    try {
      const creditContainer = viewer.cesiumWidget.creditContainer as HTMLElement
      creditContainer.style.fontSize = '10px'
      creditContainer.style.opacity = '0.6'
    } catch { /* ignore */ }

    // Fly to Baltimore immediately
    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(BALTIMORE_LNG, BALTIMORE_LAT, INITIAL_ALT),
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(-35),
        roll: 0,
      },
    })

    // Load Google Photorealistic 3D Tiles
    // @ts-expect-error onlyUsingWithGoogleGeocoder is valid but not in TS types
    Cesium.createGooglePhotorealistic3DTileset(undefined, { onlyUsingWithGoogleGeocoder: true }).then((tileset: CesiumType.Cesium3DTileset) => {
      const v = viewerRef.current
      if (!v || v.isDestroyed()) return
      v.scene.primitives.add(tileset)
    }).catch(() => {
      // Silently ignore — viewer may have been destroyed during async load
    })

    // Add UFO entity (hidden initially until fly mode)
    // Model credit: "ufo" by thundercg9 (https://skfb.ly/onJSA) — CC Attribution 4.0
    const ufoEntity = viewer.entities.add({
      name: 'UFO',
      position: Cesium.Cartesian3.fromDegrees(BALTIMORE_LNG, BALTIMORE_LAT, INITIAL_ALT),
      model: {
        uri: '/ufoHQ/scene.gltf',
        minimumPixelSize: 32,
        maximumScale: 20,
        scale: 0.5,
        silhouetteColor: Cesium.Color.CYAN,
        silhouetteSize: 1,
      },
      show: false,
    })
    ufoEntityRef.current = ufoEntity

    setTimeout(() => setLoading(false), 2500)

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.destroy()
      }
      viewerRef.current = null
    }
  }, [])

  // Handle mode changes
  useEffect(() => {
    if (!viewerRef.current || viewerRef.current.isDestroyed()) return
    const viewer = viewerRef.current

    if (mode === 'spaceship') {
      // Enable UFO entity
      if (ufoEntityRef.current) ufoEntityRef.current.show = true

      // Initialize flight state from current camera position
      const carto = Cesium.Cartographic.fromCartesian(viewer.camera.position)
      flightRef.current = {
        position: Cesium.Cartesian3.fromRadians(carto.longitude, carto.latitude, carto.height),
        heading: viewer.camera.heading,
        pitch: 0,
        speed: 0,
      }

      // Disable default camera controls
      viewer.scene.screenSpaceCameraController.enableRotate = false
      viewer.scene.screenSpaceCameraController.enableTranslate = false
      viewer.scene.screenSpaceCameraController.enableZoom = false
      viewer.scene.screenSpaceCameraController.enableTilt = false
      viewer.scene.screenSpaceCameraController.enableLook = false

      startFlightLoop()
    } else {
      // Disable UFO
      if (ufoEntityRef.current) ufoEntityRef.current.show = false
      flightRef.current = null

      // Re-enable default camera controls
      viewer.scene.screenSpaceCameraController.enableRotate = true
      viewer.scene.screenSpaceCameraController.enableTranslate = true
      viewer.scene.screenSpaceCameraController.enableZoom = true
      viewer.scene.screenSpaceCameraController.enableTilt = true
      viewer.scene.screenSpaceCameraController.enableLook = true

      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
        animFrameRef.current = 0
      }
    }
  }, [mode])

  // Keyboard handlers
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.code)
      if (e.code === 'Space') e.preventDefault()
    }
    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.code)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  // Mouse handlers for camera orbit in fly mode
  useEffect(() => {
    if (mode !== 'spaceship') return
    const viewer = viewerRef.current
    if (!viewer || viewer.isDestroyed()) return

    // Get the actual Cesium canvas element
    const canvas = viewer.canvas

    const onPointerDown = (e: PointerEvent) => {
      isDraggingRef.current = true
      lastMouseRef.current = { x: e.clientX, y: e.clientY }
      e.preventDefault()
    }
    const onPointerUp = () => { isDraggingRef.current = false }
    const onPointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current || !flightRef.current) return
      const dx = e.clientX - lastMouseRef.current.x
      const dy = e.clientY - lastMouseRef.current.y
      lastMouseRef.current = { x: e.clientX, y: e.clientY }
      flightRef.current.heading -= dx * 0.005
      flightRef.current.pitch = Math.max(-0.5, Math.min(0.8, flightRef.current.pitch - dy * 0.003))
    }
    const onContextMenu = (e: Event) => { e.preventDefault() }

    canvas.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('contextmenu', onContextMenu)
    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('contextmenu', onContextMenu)
    }
  }, [mode])

  // Flight loop
  const startFlightLoop = useCallback(() => {
    const MOVE_SPEED = 120 // m/s base
    const BOOST = 4
    const DAMPING = 0.92
    let lastTime = performance.now()

    function loop() {
      const viewer = viewerRef.current
      const flight = flightRef.current
      if (!viewer || viewer.isDestroyed() || !flight) return

      const now = performance.now()
      const dt = Math.min((now - lastTime) / 1000, 0.1)
      lastTime = now

      const keys = keysRef.current
      const boost = keys.has('ShiftLeft') || keys.has('ShiftRight') ? BOOST : 1
      const speed = MOVE_SPEED * boost

      // Q/E rotate UFO heading
      if (keys.has('KeyQ')) flight.heading += 1.5 * dt
      if (keys.has('KeyE')) flight.heading -= 1.5 * dt

      // Arrow Keys = camera orbit (independent of UFO movement)
      if (keys.has('ArrowLeft')) flightRef.current!.heading += 1.5 * dt
      if (keys.has('ArrowRight')) flightRef.current!.heading -= 1.5 * dt
      if (keys.has('ArrowUp')) flightRef.current!.pitch = Math.max(-0.5, flightRef.current!.pitch - 1.0 * dt)
      if (keys.has('ArrowDown')) flightRef.current!.pitch = Math.min(0.8, flightRef.current!.pitch + 1.0 * dt)

      // WASD = UFO physical movement only
      let forwardSpeed = 0
      let strafeSpeed = 0
      let verticalSpeed = 0
      if (keys.has('KeyW')) forwardSpeed -= speed
      if (keys.has('KeyS')) forwardSpeed += speed
      if (keys.has('KeyA')) strafeSpeed -= speed
      if (keys.has('KeyD')) strafeSpeed += speed
      if (keys.has('Space')) verticalSpeed += speed * 0.7
      if (keys.has('KeyC')) verticalSpeed -= speed * 0.7

      // Convert to Cartographic, move, convert back
      const carto = Cesium.Cartographic.fromCartesian(flight.position)
      const earthRadius = 6378137.0

      // Move in heading direction
      const dLat = (forwardSpeed * Math.cos(flight.heading) - strafeSpeed * Math.sin(flight.heading)) * dt / earthRadius
      const dLng = (forwardSpeed * Math.sin(flight.heading) + strafeSpeed * Math.cos(flight.heading)) * dt / (earthRadius * Math.cos(carto.latitude))

      carto.latitude += dLat
      carto.longitude += dLng
      carto.height += verticalSpeed * dt
      carto.height = Math.max(5, carto.height) // don't go underground

      flight.position = Cesium.Cartesian3.fromRadians(carto.longitude, carto.latitude, carto.height)
      flight.speed = Math.sqrt(forwardSpeed * forwardSpeed + strafeSpeed * strafeSpeed + verticalSpeed * verticalSpeed)

      // Update UFO entity position with wobble
      wobbleTimeRef.current += dt
      const t = wobbleTimeRef.current
      const wobbleRoll = Math.sin(t * 1.3) * 0.06
      const wobblePitch = Math.sin(t * 0.9 + 1.2) * 0.04
      const tiltRoll = (strafeSpeed / MOVE_SPEED) * 0.18  // bank into turns
      const tiltPitch = (-forwardSpeed / MOVE_SPEED) * 0.08 // nose dip on acceleration
      if (ufoEntityRef.current) {
        ufoEntityRef.current.position = new Cesium.ConstantPositionProperty(flight.position)
        ufoEntityRef.current.orientation = new Cesium.ConstantProperty(
          Cesium.Transforms.headingPitchRollQuaternion(
            flight.position,
            new Cesium.HeadingPitchRoll(flight.heading, wobblePitch + tiltPitch, wobbleRoll + tiltRoll)
          )
        )
      }

      // Third-person camera: behind and above the UFO
      const cameraOffset = new Cesium.HeadingPitchRange(
        flight.heading + Math.PI, // behind
        flight.pitch - 0.3, // slightly above looking down
        400 // distance
      )

      const transform = Cesium.Transforms.eastNorthUpToFixedFrame(flight.position)
      viewer.camera.lookAtTransform(
        transform,
        cameraOffset
      )

      // Update HUD
      const latDeg = Cesium.Math.toDegrees(carto.latitude)
      const lngDeg = Cesium.Math.toDegrees(carto.longitude)
      setHudData({ lat: latDeg, lng: lngDeg, alt: carto.height, speed: flight.speed * 3.6 })

      animFrameRef.current = requestAnimationFrame(loop)
    }

    animFrameRef.current = requestAnimationFrame(loop)
  }, [])

  // Update HUD in orbit mode
  useEffect(() => {
    if (mode !== 'orbit') return
    const viewer = viewerRef.current
    if (!viewer) return

    const interval = setInterval(() => {
      if (!viewerRef.current || viewerRef.current.isDestroyed()) return
      const carto = Cesium.Cartographic.fromCartesian(viewerRef.current.camera.position)
      setHudData({
        lat: Cesium.Math.toDegrees(carto.latitude),
        lng: Cesium.Math.toDegrees(carto.longitude),
        alt: carto.height,
        speed: 0,
      })
    }, 200)

    return () => clearInterval(interval)
  }, [mode])

  return (
    <div className="relative w-full h-full">
      {/* Loading screen */}
      {loading && (
        <div className="absolute inset-0 bg-black flex flex-col items-center justify-center z-50">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-cyan-400 tracking-wider mb-2">OPEN WORLD</h1>
            <h2 className="text-6xl font-black text-white tracking-widest">BALTIMORE</h2>
          </div>
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mb-4" />
          <p className="text-cyan-400/80 font-mono text-sm">Loading Google Photorealistic 3D Tiles via CesiumJS...</p>
        </div>
      )}

      {/* HUD */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/60 backdrop-blur-sm rounded-full px-6 py-2 border border-cyan-500/30 z-10 pointer-events-none">
        <Rocket className="w-4 h-4 text-cyan-400" />
        <span className="text-cyan-400 font-mono text-sm uppercase tracking-wider">
          {mode === 'spaceship' ? 'Spaceship' : 'Orbit'} Mode
        </span>
        <span className="text-cyan-500/40">|</span>
        <Globe className="w-3.5 h-3.5 text-cyan-400/60" />
        <span className="text-cyan-400/60 font-mono text-xs">CesiumJS</span>
      </div>

      {/* Position HUD */}
      <div className="absolute top-16 left-4 bg-black/60 backdrop-blur-sm rounded-lg p-4 border border-cyan-500/20 min-w-[200px] z-10 pointer-events-none">
        <div className="space-y-1.5">
          <div className="flex justify-between">
            <span className="text-gray-400 font-mono text-xs">LAT</span>
            <span className="text-white font-mono text-xs">{hudData.lat.toFixed(5)}°</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400 font-mono text-xs">LNG</span>
            <span className="text-white font-mono text-xs">{hudData.lng.toFixed(5)}°</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400 font-mono text-xs">ALT</span>
            <span className="text-white font-mono text-xs">{hudData.alt.toFixed(0)}m</span>
          </div>
          {mode === 'spaceship' && (
            <div className="flex justify-between">
              <span className="text-gray-400 font-mono text-xs">SPD</span>
              <span className="text-white font-mono text-xs">{hudData.speed.toFixed(0)} km/h</span>
            </div>
          )}
        </div>
      </div>

      {/* Control Panel */}
      <div className="absolute top-16 right-4 z-20 pointer-events-auto w-44">
        <div className="bg-black/70 backdrop-blur-md rounded-xl border border-cyan-500/20 overflow-hidden">
          {/* Mode */}
          <div className="p-3 border-b border-white/5">
            <span className="text-cyan-400 font-mono text-[9px] uppercase tracking-widest">Mode</span>
            <div className="flex gap-1.5 mt-2">
              <button
                onClick={() => setMode('orbit')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[10px] font-mono uppercase transition-all cursor-pointer ${
                  mode === 'orbit' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <Globe className="w-3 h-3" /> Orbit
              </button>
              <button
                onClick={() => setMode('spaceship')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[10px] font-mono uppercase transition-all cursor-pointer ${
                  mode === 'spaceship' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <Rocket className="w-3 h-3" /> Fly
              </button>
            </div>
          </div>
          {/* Skybox */}
          <div className="p-3">
            <span className="text-cyan-400 font-mono text-[9px] uppercase tracking-widest">Skybox</span>
            <div className="grid grid-cols-5 gap-1 mt-2">
              {SKYBOX_OPTIONS.map(({ id, label, color }) => (
                <button
                  key={id}
                  onClick={() => setSkybox(id)}
                  className={`flex flex-col items-center gap-0.5 p-1 rounded text-[7px] font-mono transition-all cursor-pointer ${
                    skybox === id ? 'ring-1 ring-cyan-400 bg-cyan-500/10' : 'hover:bg-white/5'
                  }`}
                  title={label}
                >
                  <div className={`w-3.5 h-3.5 rounded-full ${color} ${skybox === id ? 'ring-1 ring-white' : 'opacity-60'}`} />
                  <span className={skybox === id ? 'text-white' : 'text-gray-500'}>{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Controls help */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm rounded-lg px-5 py-2 border border-white/10 z-10 pointer-events-none">
        {mode === 'orbit' ? (
          <div className="flex gap-3 text-[10px] font-mono text-gray-400">
            <span><kbd className="text-white bg-white/10 px-1 rounded">Left Drag</kbd> Orbit</span>
            <span><kbd className="text-white bg-white/10 px-1 rounded">Right Drag</kbd> Zoom</span>
            <span><kbd className="text-white bg-white/10 px-1 rounded">Ctrl+Drag</kbd> Tilt</span>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <div className="flex gap-3 text-[10px] font-mono text-gray-400">
              <span><kbd className="text-white bg-white/10 px-1 rounded">WASD</kbd> Move UFO</span>
              <span><kbd className="text-white bg-white/10 px-1 rounded">↑↓←→</kbd> Camera</span>
              <span><kbd className="text-white bg-white/10 px-1 rounded">Q/E</kbd> UFO Rotate</span>
              <span><kbd className="text-white bg-white/10 px-1 rounded">Space</kbd> Up</span>
              <span><kbd className="text-white bg-white/10 px-1 rounded">C</kbd> Down</span>
              <span><kbd className="text-white bg-white/10 px-1 rounded">Shift</kbd> Boost</span>
              <span><kbd className="text-white bg-white/10 px-1 rounded">Drag</kbd> Orbit</span>
            </div>
          </div>
        )}
      </div>

      {/* Cesium container */}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  )
}
