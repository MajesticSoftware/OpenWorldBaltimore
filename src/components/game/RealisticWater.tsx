'use client'

import { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { EastNorthUpFrame } from '3d-tiles-renderer/r3f'

// Inner Harbor actual center (from GeoHack: 39.283494, -76.609897)
const HARBOR_LAT = 39.2835 * Math.PI / 180
const HARBOR_LNG = -76.6099 * Math.PI / 180

const waterVertexShader = `
  uniform float uTime;
  uniform float uWaveHeight;
  uniform float uWaveFreq;
  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying float vElevation;

  void main() {
    vUv = uv;
    vec3 pos = position;
    float wave1 = sin(pos.x * uWaveFreq * 0.7 + uTime * 1.2) * cos(pos.y * uWaveFreq * 0.5 + uTime * 0.8);
    float wave2 = sin(pos.x * uWaveFreq * 1.3 + uTime * 0.9 + 2.0) * cos(pos.y * uWaveFreq * 1.1 + uTime * 1.1 + 1.0) * 0.5;
    float wave3 = sin(pos.x * uWaveFreq * 2.7 + uTime * 1.8 + 4.0) * cos(pos.y * uWaveFreq * 2.3 + uTime * 1.5 + 3.0) * 0.25;
    float elevation = (wave1 + wave2 + wave3) * uWaveHeight;
    pos.z += elevation;
    vElevation = elevation;
    float dx = uWaveFreq * uWaveHeight * (
      0.7 * cos(pos.x * uWaveFreq * 0.7 + uTime * 1.2) * cos(pos.y * uWaveFreq * 0.5 + uTime * 0.8) +
      0.65 * cos(pos.x * uWaveFreq * 1.3 + uTime * 0.9 + 2.0) * cos(pos.y * uWaveFreq * 1.1 + uTime * 1.1 + 1.0)
    );
    float dy = uWaveFreq * uWaveHeight * (
      -0.5 * sin(pos.x * uWaveFreq * 0.7 + uTime * 1.2) * sin(pos.y * uWaveFreq * 0.5 + uTime * 0.8) +
      -0.55 * sin(pos.x * uWaveFreq * 1.3 + uTime * 0.9 + 2.0) * sin(pos.y * uWaveFreq * 1.1 + uTime * 1.1 + 1.0)
    );
    vNormal = normalize(vec3(-dx, -dy, 1.0));
    vec4 worldPos = modelMatrix * vec4(pos, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`

const waterFragmentShader = `
  uniform float uTime;
  uniform vec3 uDeepColor;
  uniform vec3 uShallowColor;
  uniform vec3 uFoamColor;
  uniform vec3 uSunDirection;
  uniform vec3 uSunColor;
  uniform float uFresnelPower;
  uniform float uOpacity;
  uniform vec3 uCameraPosition;
  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying float vElevation;

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(uCameraPosition - vWorldPos);
    float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), uFresnelPower);
    vec3 waterColor = mix(uDeepColor, uShallowColor, fresnel * 0.6);
    vec3 sunDir = normalize(uSunDirection);
    vec3 halfDir = normalize(sunDir + viewDir);
    float specular = pow(max(dot(normal, halfDir), 0.0), 256.0);
    float specularBroad = pow(max(dot(normal, halfDir), 0.0), 32.0) * 0.3;
    float foam = smoothstep(0.3, 0.6, vElevation / 0.8) * 0.35;
    float caustics = sin(vUv.x * 40.0 + uTime * 0.5) * sin(vUv.y * 40.0 + uTime * 0.3) * 0.02;
    vec3 color = waterColor;
    color += uSunColor * specular * 1.5;
    color += uSunColor * specularBroad * 0.4;
    color = mix(color, uFoamColor, foam);
    color += caustics;
    gl_FragColor = vec4(color, uOpacity + fresnel * 0.1);
  }
`

interface RealisticWaterProps {
  width?: number
  height?: number
  visible?: boolean
}

export default function RealisticWater({ width = 500, height = 400, visible = true }: RealisticWaterProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const { camera } = useThree()

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uWaveHeight: { value: 0.3 },
    uWaveFreq: { value: 0.1 },
    uDeepColor: { value: new THREE.Color('#003847') },
    uShallowColor: { value: new THREE.Color('#0e6b7a') },
    uFoamColor: { value: new THREE.Color('#c8dde0') },
    uSunDirection: { value: new THREE.Vector3(0.5, 0.8, 0.3).normalize() },
    uSunColor: { value: new THREE.Color('#fff5e0') },
    uFresnelPower: { value: 3.0 },
    uOpacity: { value: 0.85 },
    uCameraPosition: { value: new THREE.Vector3() },
  }), [])

  useFrame((_, delta) => {
    if (!visible) return
    uniforms.uTime.value += delta
    uniforms.uCameraPosition.value.copy(camera.position)
  })

  if (!visible) return null

  return (
    <EastNorthUpFrame lat={HARBOR_LAT} lon={HARBOR_LNG} height={0}>
      <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, height, 96, 96]} />
        <shaderMaterial
          vertexShader={waterVertexShader}
          fragmentShader={waterFragmentShader}
          uniforms={uniforms}
          transparent
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </EastNorthUpFrame>
  )
}
