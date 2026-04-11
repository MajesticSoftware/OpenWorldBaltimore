'use client'

import { useThree } from '@react-three/fiber'
import { useEffect, useMemo, Suspense } from 'react'
import { useLoader } from '@react-three/fiber'
import * as THREE from 'three'

export type SkyboxPreset = 'default' | 'sunset' | 'night' | 'cyberpunk' | 'overcast' | 'fairy_forest' | 'mountain' | 'custom'

// Direct texture URLs for skybox sphere presets
const TEXTURE_SKYBOXES: Partial<Record<SkyboxPreset, string>> = {
  fairy_forest: '/free_-_skybox_fairy_forest_day/textures/Scene_-_Root_diffuse.jpeg',
  mountain: '/mountain_skybox/textures/Material.001_baseColor.png',
}

// Gradient color presets
const GRADIENT_PRESETS: Record<string, { top: string; horizon: string; bottom: string }> = {
  default: { top: '#4a8ab5', horizon: '#87ceeb', bottom: '#c8dce8' },
  sunset: { top: '#1a0a2e', horizon: '#cc5522', bottom: '#ffaa44' },
  night: { top: '#020111', horizon: '#080828', bottom: '#0a0a1a' },
  cyberpunk: { top: '#1a003a', horizon: '#aa00cc', bottom: '#220033' },
  overcast: { top: '#707880', horizon: '#9aa0a8', bottom: '#b0b4b8' },
}

interface SkyboxProps {
  preset: SkyboxPreset
  customUrls?: string[]
}

// Generate gradient cubemap for scene.background
function generateGradientCubemap(
  topColor: THREE.Color,
  horizonColor: THREE.Color,
  bottomColor: THREE.Color,
  size: number = 512
): THREE.CubeTexture {
  const faces: HTMLCanvasElement[] = []
  for (let face = 0; face < 6; face++) {
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!
    const gradient = ctx.createLinearGradient(0, 0, 0, size)
    if (face === 2) {
      gradient.addColorStop(0, `#${topColor.getHexString()}`)
      gradient.addColorStop(1, `#${topColor.getHexString()}`)
    } else if (face === 3) {
      gradient.addColorStop(0, `#${bottomColor.getHexString()}`)
      gradient.addColorStop(1, `#${bottomColor.getHexString()}`)
    } else {
      gradient.addColorStop(0, `#${topColor.getHexString()}`)
      gradient.addColorStop(0.4, `#${horizonColor.getHexString()}`)
      gradient.addColorStop(0.6, `#${horizonColor.getHexString()}`)
      gradient.addColorStop(1, `#${bottomColor.getHexString()}`)
    }
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, size, size)
    faces.push(canvas)
  }
  const texture = new THREE.CubeTexture(faces)
  texture.needsUpdate = true
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

// Equirectangular panorama skybox: sets scene.background directly
function TextureSkybox({ url }: { url: string }) {
  const texture = useLoader(THREE.TextureLoader, url)
  const { scene } = useThree()

  useEffect(() => {
    texture.mapping = THREE.EquirectangularReflectionMapping
    texture.colorSpace = THREE.SRGBColorSpace
    scene.background = texture
    return () => { scene.background = null }
  }, [texture, scene])

  return null
}

// Gradient skybox: sets scene.background to a cubemap
function GradientSkybox({ preset, customUrls }: { preset: string; customUrls?: string[] }) {
  const { scene } = useThree()

  const texture = useMemo(() => {
    if (preset === 'custom' && customUrls && customUrls.length === 6) {
      const loader = new THREE.CubeTextureLoader()
      const tex = loader.load(customUrls)
      tex.colorSpace = THREE.SRGBColorSpace
      return tex
    }
    const colors = GRADIENT_PRESETS[preset] || GRADIENT_PRESETS.default
    return generateGradientCubemap(
      new THREE.Color(colors.top),
      new THREE.Color(colors.horizon),
      new THREE.Color(colors.bottom)
    )
  }, [preset, customUrls])

  useEffect(() => {
    scene.background = texture
    return () => { scene.background = null }
  }, [scene, texture])

  return null
}

export default function Skybox({ preset, customUrls }: SkyboxProps) {
  const { scene } = useThree()
  const isTexture = preset in TEXTURE_SKYBOXES

  useEffect(() => {
    if (isTexture) scene.background = null
  }, [isTexture, scene])

  if (isTexture) {
    return (
      <Suspense fallback={null}>
        <TextureSkybox url={TEXTURE_SKYBOXES[preset]!} />
      </Suspense>
    )
  }

  return <GradientSkybox preset={preset} customUrls={customUrls} />
}
