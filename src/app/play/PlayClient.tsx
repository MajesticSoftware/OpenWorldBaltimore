'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import Script from 'next/script'
import CesiumErrorBoundary from '@/components/game/CesiumErrorBoundary'

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

interface Props {
  ionToken: string
}

export default function PlayClient({ ionToken }: Props) {
  const [ready, setReady] = useState(false)

  return (
    <>
      {/* Load Cesium.js as a plain script — keeps webpack/Terser from bundling it. */}
      <Script
        src="/cesium/Cesium.js"
        strategy="afterInteractive"
        onLoad={() => {
          (window as unknown as Record<string, unknown>).CESIUM_BASE_URL = '/cesium'
          setReady(true)
        }}
      />
      <link rel="stylesheet" href="/cesium/Widgets/widgets.css" />
      <div className="w-full h-screen overflow-hidden bg-black">
        <CesiumErrorBoundary>
          {ready && <CesiumScene ionToken={ionToken} />}
        </CesiumErrorBoundary>
      </div>
    </>
  )
}
