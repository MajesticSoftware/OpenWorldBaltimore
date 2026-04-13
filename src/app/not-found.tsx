import Link from 'next/link'
import { MapPin } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white px-6 text-center">
      <MapPin className="w-12 h-12 text-cyan-400 mb-6 opacity-60" />
      <h1 className="text-8xl font-black text-cyan-400 mb-2">404</h1>
      <h2 className="text-2xl font-bold text-white mb-4">Page not found</h2>
      <p className="text-gray-400 max-w-sm mb-8 text-sm">
        This location doesn&apos;t exist on the map. Head back to Baltimore.
      </p>
      <Link
        href="/"
        className="px-6 py-3 bg-cyan-500 text-black font-bold rounded-xl hover:bg-cyan-400 transition"
      >
        Back to Home
      </Link>
    </div>
  )
}
