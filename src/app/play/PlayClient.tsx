'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
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
  const [ready, setReady] = useState(
    () => typeof window !== 'undefined' && Boolean((window as unknown as Record<string, unknown>).Cesium)
  )

  useEffect(() => {
    let cancelled = false
    const existing = document.querySelector('script[data-cesium-script="true"]') as HTMLScriptElement | null
    if (existing) {
      if ((window as unknown as Record<string, unknown>).Cesium) {
        ;(window as unknown as Record<string, unknown>).CESIUM_BASE_URL = '/cesium'
      } else {
        existing.addEventListener('load', () => {
          if (cancelled) return
          ;(window as unknown as Record<string, unknown>).CESIUM_BASE_URL = '/cesium'
          setReady(true)
        }, { once: true })
      }
      return () => { cancelled = true }
    }

    const script = document.createElement('script')
    script.src = '/cesium/Cesium.js'
    script.async = true
    script.dataset.cesiumScript = 'true'
    script.onload = () => {
      if (cancelled) return
      ;(window as unknown as Record<string, unknown>).CESIUM_BASE_URL = '/cesium'
      setReady(true)
    }
    document.head.appendChild(script)

    return () => { cancelled = true }
  }, [])

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link rel="stylesheet" href="/cesium/Widgets/widgets.css" />
      <div className="w-full h-screen overflow-hidden bg-black">
        <CesiumErrorBoundary>
          {ready && <CesiumScene ionToken={ionToken} />}
        </CesiumErrorBoundary>
      </div>
    </>
  )
}
