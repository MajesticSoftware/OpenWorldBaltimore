import Link from "next/link";
import { Rocket, Car, Plane, User, MapPin, Building2, Waves } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-black overflow-hidden">
      {/* Hero Section */}
      <main className="relative flex flex-1 flex-col items-center justify-center px-6">
        {/* Background grid effect */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,212,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,212,255,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />

        {/* Radial glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-cyan-500/5 rounded-full blur-3xl" />

        <div className="relative z-10 text-center max-w-4xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-8 rounded-full border border-cyan-500/20 bg-cyan-500/5">
            <MapPin className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider">39.2856° N, 76.6122° W</span>
          </div>

          {/* Title */}
          <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-4">
            <span className="text-cyan-400">OPEN WORLD</span>
            <br />
            <span className="text-white">BALTIMORE</span>
          </h1>

          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-12 leading-relaxed">
            Explore a real 3D recreation of Baltimore in your browser.
            Every building extruded from real OpenStreetMap data.
            Fly over the Inner Harbor in a spaceship.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link
              href="/play"
              className="group flex items-center gap-3 px-8 py-4 bg-cyan-500 text-black font-bold text-lg rounded-xl hover:bg-cyan-400 transition-all hover:scale-105 shadow-lg shadow-cyan-500/25"
            >
              <Rocket className="w-5 h-5 group-hover:rotate-12 transition-transform" />
              Launch Game
            </Link>
            <Link
              href="/play"
              className="flex items-center gap-3 px-8 py-4 border border-gray-700 text-gray-300 font-medium text-lg rounded-xl hover:border-cyan-500/50 hover:text-white transition-all"
            >
              Explore Baltimore
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-lg mx-auto mb-20">
            <div className="text-center">
              <Building2 className="w-5 h-5 text-cyan-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">108K+</div>
              <div className="text-xs text-gray-500 font-mono uppercase">Buildings</div>
            </div>
            <div className="text-center">
              <Waves className="w-5 h-5 text-cyan-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">Real</div>
              <div className="text-xs text-gray-500 font-mono uppercase">Inner Harbor</div>
            </div>
            <div className="text-center">
              <MapPin className="w-5 h-5 text-cyan-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">2km²</div>
              <div className="text-xs text-gray-500 font-mono uppercase">Downtown</div>
            </div>
          </div>

          {/* Vehicle Modes Preview */}
          <div className="mb-12">
            <h3 className="text-sm font-mono text-gray-500 uppercase tracking-wider mb-6">Vehicle Modes</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
              <div className="flex flex-col items-center gap-2 p-4 rounded-xl border border-cyan-500/30 bg-cyan-500/5">
                <Rocket className="w-6 h-6 text-cyan-400" />
                <span className="text-sm font-medium text-white">Spaceship</span>
                <span className="text-[10px] font-mono text-cyan-400 uppercase">Available</span>
              </div>
              <div className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-800 bg-gray-900/50 opacity-50">
                <Car className="w-6 h-6 text-gray-600" />
                <span className="text-sm font-medium text-gray-500">Car</span>
                <span className="text-[10px] font-mono text-gray-600 uppercase">Coming Soon</span>
              </div>
              <div className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-800 bg-gray-900/50 opacity-50">
                <Plane className="w-6 h-6 text-gray-600" />
                <span className="text-sm font-medium text-gray-500">Plane</span>
                <span className="text-[10px] font-mono text-gray-600 uppercase">Coming Soon</span>
              </div>
              <div className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-800 bg-gray-900/50 opacity-50">
                <User className="w-6 h-6 text-gray-600" />
                <span className="text-sm font-medium text-gray-500">On Foot</span>
                <span className="text-[10px] font-mono text-gray-600 uppercase">Coming Soon</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center py-6 border-t border-gray-900">
        <p className="text-xs text-gray-600 font-mono">
          Built with Three.js + OpenStreetMap + Next.js | Data © OpenStreetMap Contributors
        </p>
      </footer>
    </div>
  );
}
