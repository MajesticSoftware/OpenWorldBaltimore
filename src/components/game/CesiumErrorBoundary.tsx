'use client'

import { Component, type ReactNode } from 'react'
import { Rocket } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export default class CesiumErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (this.state.error) {
      const msg = this.state.error.message ?? ''
      const isWebGL = msg.toLowerCase().includes('webgl') || msg.toLowerCase().includes('context')
      return (
        <div className="w-full h-screen bg-black flex flex-col items-center justify-center gap-6 px-6 text-center">
          <Rocket className="w-12 h-12 text-cyan-400 opacity-60" />
          <h1 className="text-2xl font-bold text-white">Failed to launch</h1>
          <p className="text-gray-400 max-w-md text-sm leading-relaxed">
            {isWebGL
              ? 'Your browser or device does not support WebGL, which is required to render the 3D scene. Try Chrome or Edge on a desktop with a GPU.'
              : 'An error occurred loading the 3D engine. Please refresh and try again.'}
          </p>
          <p className="text-xs text-gray-600 font-mono max-w-md break-all">{msg}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-cyan-500 text-black font-bold rounded-xl hover:bg-cyan-400 transition"
          >
            Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
