"use client";

import { useState } from "react";
import TempleRunGame from "@/components/temple-run-game";

export default function Home() {
  const [showInstructions, setShowInstructions] = useState(false);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-black">
      {/* Game canvas fills the entire screen */}
      <TempleRunGame />

      {/* Top-left title branding */}
      <div className="absolute top-4 left-4 z-10 pointer-events-none select-none">
        <h1 className="text-2xl font-bold text-yellow-400 drop-shadow-lg flex items-center gap-2">
          🏃 Temple Run
        </h1>
      </div>

      {/* Instructions toggle button */}
      <button
        onClick={() => setShowInstructions(!showInstructions)}
        className="absolute top-4 right-4 z-20 px-3 py-1.5 bg-black/60 border border-yellow-600/40 text-yellow-300 text-sm rounded-lg hover:bg-yellow-900/40 transition-colors"
      >
        {showInstructions ? "✕ Close" : "ℹ Controls"}
      </button>

      {/* Instructions panel */}
      {showInstructions && (
        <div className="absolute top-16 right-4 z-20 bg-black/85 border border-yellow-700/40 rounded-xl p-5 text-white text-sm w-64 shadow-2xl backdrop-blur-sm">
          <h3 className="text-yellow-400 font-bold text-base mb-3">🎮 Controls</h3>
          <div className="space-y-2.5">
            <div className="flex items-center gap-3">
              <span className="text-yellow-300 font-mono text-xs bg-white/10 px-2 py-1 rounded">←</span>
              <span className="text-yellow-300 font-mono text-xs bg-white/10 px-2 py-1 rounded">→</span>
              <span className="text-gray-300">Move lanes</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-yellow-300 font-mono text-xs bg-white/10 px-2 py-1 rounded">↑</span>
              <span className="text-yellow-300 font-mono text-xs bg-white/10 px-2 py-1 rounded">Space</span>
              <span className="text-gray-300">Jump</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-yellow-300 font-mono text-xs bg-white/10 px-2 py-1 rounded">↓</span>
              <span className="text-gray-300">Slide / Duck</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-yellow-300 font-mono text-xs bg-white/10 px-2 py-1 rounded">Tap</span>
              <span className="text-gray-300">Start / Jump (mobile)</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-yellow-300 font-mono text-xs bg-white/10 px-2 py-1 rounded">Swipe</span>
              <span className="text-gray-300">Move (mobile)</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-white/10 text-gray-400 text-xs">
            <p>🏆 Dodge obstacles, collect coins, run as far as you can!</p>
          </div>
        </div>
      )}

      {/* Bottom mobile controls hint */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
        <p className="text-white/30 text-xs text-center">
          ← Swipe to move · Tap to jump · ↓ Swipe to slide
        </p>
      </div>
    </main>
  );
}
