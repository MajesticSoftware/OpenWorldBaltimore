'use client'

import { useState, useCallback, useRef, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import GoogleTiles from './GoogleTiles'
import PhotoHUD from './PhotoHUD'
import { usePlayerSession } from '@/hooks/usePlayerSession'
import { Loader2, Rocket, Globe, Keyboard, Waves, TreePine, Mountain } from 'lucide-react'
import Skybox, { type SkyboxPreset } from './Skybox'

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''

type GameMode = 'orbit' | 'spaceship'

const SKYBOX_OPTIONS: { id: SkyboxPreset; label: string; color: string }[] = [
  { id: 'default', label: 'Day', color: 'bg-sky-400' },
  { id: 'sunset', label: 'Sunset', color: 'bg-orange-400' },
  { id: 'night', label: 'Night', color: 'bg-indigo-900' },
  { id: 'cyberpunk', label: 'Cyber', color: 'bg-fuchsia-500' },
  { id: 'overcast', label: 'Cloudy', color: 'bg-gray-400' },
  { id: 'fairy_forest', label: 'Forest', color: 'bg-emerald-500' },
  { id: 'mountain', label: 'Mountain', color: 'bg-stone-400' },
]

function LoadingScreen({ progress }: { progress: string }) {
  return (
    <div className="absolute inset-0 bg-black flex flex-col items-center justify-center z-50">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-cyan-400 tracking-wider mb-2">OPEN WORLD</h1>
        <h2 className="text-6xl font-black text-white tracking-widest">BALTIMORE</h2>
      </div>
      <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mb-4" />
      <p className="text-cyan-400/80 font-mono text-sm">{progress}</p>
      <div className="mt-8 w-64 h-1 bg-gray-800 rounded-full overflow-hidden">
        <div className="h-full bg-cyan-400 rounded-full animate-pulse" style={{ width: '60%' }} />
      </div>
    </div>
  )
}

function ControlPanel({
  mode, onModeChange, skybox, onSkyboxChange, waterVisible, onWaterToggle,
}: {
  mode: GameMode; onModeChange: (m: GameMode) => void
  skybox: SkyboxPreset; onSkyboxChange: (s: SkyboxPreset) => void
  waterVisible: boolean; onWaterToggle: () => void
}) {
  return (
    <div className="absolute top-14 right-3 z-20 pointer-events-auto w-44">
      <div className="bg-black/70 backdrop-blur-md rounded-xl border border-cyan-500/20 overflow-hidden">
        {/* Mode Section */}
        <div className="p-3 border-b border-white/5">
          <span className="text-cyan-400 font-mono text-[9px] uppercase tracking-widest">Mode</span>
          <div className="flex gap-1.5 mt-2">
            <button
              onClick={() => onModeChange('orbit')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[10px] font-mono uppercase transition-all cursor-pointer ${
                mode === 'orbit' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <Globe className="w-3 h-3" /> Orbit
            </button>
            <button
              onClick={() => onModeChange('spaceship')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[10px] font-mono uppercase transition-all cursor-pointer ${
                mode === 'spaceship' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <Rocket className="w-3 h-3" /> Fly
            </button>
          </div>
        </div>

        {/* Skybox Section */}
        <div className="p-3 border-b border-white/5">
          <span className="text-cyan-400 font-mono text-[9px] uppercase tracking-widest">Skybox</span>
          <div className="grid grid-cols-4 gap-1 mt-2">
            {SKYBOX_OPTIONS.map(({ id, label, color }) => (
              <button
                key={id}
                onClick={() => onSkyboxChange(id)}
                className={`flex flex-col items-center gap-0.5 p-1 rounded text-[8px] font-mono transition-all cursor-pointer ${
                  skybox === id ? 'ring-1 ring-cyan-400 bg-cyan-500/10' : 'hover:bg-white/5'
                }`}
                title={label}
              >
                <div className={`w-4 h-4 rounded-full ${color} ${skybox === id ? 'ring-1 ring-white' : 'opacity-60'}`} />
                <span className={skybox === id ? 'text-white' : 'text-gray-500'}>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Water Toggle */}
        <div className="p-3">
          <button
            onClick={onWaterToggle}
            className={`w-full flex items-center justify-center gap-2 py-1.5 rounded-md text-[10px] font-mono uppercase transition-all cursor-pointer ${
              waterVisible ? 'bg-cyan-500/15 text-cyan-400' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <Waves className="w-3 h-3" />
            Water {waterVisible ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ControlsHelp({ mode }: { mode: GameMode }) {
  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm rounded-lg px-5 py-2 border border-white/10 z-10 pointer-events-none">
      {mode === 'orbit' ? (
        <div className="flex gap-3 text-[10px] font-mono text-gray-400">
          <span><kbd className="text-white bg-white/10 px-1 rounded">Left Drag</kbd> Orbit</span>
          <span><kbd className="text-white bg-white/10 px-1 rounded">Right Drag</kbd> Pan</span>
          <span><kbd className="text-white bg-white/10 px-1 rounded">Scroll</kbd> Zoom</span>
        </div>
      ) : (
        <div className="flex gap-3 text-[10px] font-mono text-gray-400">
          <span><kbd className="text-white bg-white/10 px-1 rounded">WASD</kbd> Move</span>
          <span><kbd className="text-white bg-white/10 px-1 rounded">Q/E</kbd> Rotate</span>
          <span><kbd className="text-white bg-white/10 px-1 rounded">Space</kbd> Up</span>
          <span><kbd className="text-white bg-white/10 px-1 rounded">C</kbd> Down</span>
          <span><kbd className="text-white bg-white/10 px-1 rounded">Shift</kbd> Boost</span>
          <span><kbd className="text-white bg-white/10 px-1 rounded">Drag</kbd> Orbit</span>
        </div>
      )}
    </div>
  )
}

export default function GameScene() {
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<GameMode>('orbit')
  const [skybox, setSkybox] = useState<SkyboxPreset>('default')
  const [waterVisible, setWaterVisible] = useState(true)
  const [hudData, setHudData] = useState({
    position: { x: 0, y: 800, z: 0 },
    speed: 0,
  })

  const { updateTelemetry } = usePlayerSession()
  const lastHudUpdate = useRef(0)
  const hasLoaded = useRef(false)

  const handlePositionUpdate = useCallback(
    (position: THREE.Vector3, _rotation: THREE.Euler, speed: number) => {
      if (!hasLoaded.current) {
        hasLoaded.current = true
        setTimeout(() => setLoading(false), 2000)
      }

      const now = Date.now()
      if (now - lastHudUpdate.current > 50) {
        lastHudUpdate.current = now
        setHudData({
          position: { x: position.x, y: position.y, z: position.z },
          speed,
        })
      }
      updateTelemetry({ x: position.x, y: position.y, z: position.z }, speed)
    },
    [updateTelemetry]
  )

  if (!GOOGLE_API_KEY) {
    return (
      <div className="absolute inset-0 bg-black flex flex-col items-center justify-center">
        <h2 className="text-2xl font-bold text-red-400 mb-4">Missing Google Maps API Key</h2>
        <p className="text-gray-400 mb-6">Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to .env.local</p>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full">
      {loading && <LoadingScreen progress="Loading Google Photorealistic 3D Tiles over Baltimore..." />}

      <PhotoHUD
        position={hudData.position}
        speed={hudData.speed}
        mode={mode === 'spaceship' ? 'Spaceship' : 'Orbit'}
      />

      <ControlPanel
        mode={mode} onModeChange={setMode}
        skybox={skybox} onSkyboxChange={setSkybox}
        waterVisible={waterVisible} onWaterToggle={() => setWaterVisible(v => !v)}
      />

      <ControlsHelp mode={mode} />

      <Canvas
        shadows={false}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          logarithmicDepthBuffer: true,
        }}
        camera={{
          fov: 60,
          near: 1,
          far: 4e7,
          position: [1144722, -4809581, 4017415],
        }}
        style={{ width: '100%', height: '100%' }}
        onCreated={({ camera }) => {
          camera.lookAt(0, 0, 0)
          camera.updateMatrixWorld()
        }}
      >
        <Suspense fallback={null}>
          <Skybox preset={skybox} />
          <GoogleTiles
            apiKey={GOOGLE_API_KEY}
            mode={mode}
            waterVisible={waterVisible}
            onPositionUpdate={handlePositionUpdate}
          />
        </Suspense>
      </Canvas>
    </div>
  )
}
