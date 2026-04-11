'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import Script from 'next/script'

const CesiumScene = dynamic(() => import('@/components/game/CesiumScene'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-cyan-400 tracking-wider mb-2">OPEN WORLD</h1>
        <h2 className="text-6xl font-black text-white tracking-widest mb-8">BALTIMORE</h2>
        <p className="text-cyan-400/60 font-mono text-sm animate-pulse">Loading CesiumJS engine...</p>
      </div>
    </div>
  ),
})

export default function PlayPage() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Set CESIUM_BASE_URL globally before Cesium loads
    (window as unknown as Record<string, unknown>).CESIUM_BASE_URL = '/cesium'
    setReady(true)
  }, [])

  return (
    <>
      <link rel="stylesheet" href="/cesium/Widgets/widgets.css" />
      <div className="w-full h-screen overflow-hidden bg-black">
        {ready && <CesiumScene />}
      </div>
    </>
  )
}
