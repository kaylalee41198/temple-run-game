'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  GameState,
  createInitialState,
  startGame,
  movePlayer,
  updateGame,
  drawGame,
} from '@/lib/game-engine';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Trophy,
  Coins,
  Gauge,
  Zap,
} from 'lucide-react';

export default function TempleRunGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameStateRef = useRef<GameState>(createInitialState());
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const keysRef = useRef<Set<string>>(new Set());
  const [uiState, setUiState] = useState<{
    score: number;
    coins: number;
    speed: number;
    gameOver: boolean;
    started: boolean;
    highScore: number;
  }>({
    score: 0,
    coins: 0,
    speed: 0.15,
    gameOver: false,
    started: false,
    highScore: 0,
  });

  // Sync UI state from game state
  const syncUI = useCallback((gs: GameState) => {
    setUiState({
      score: gs.score,
      coins: gs.coins,
      speed: Math.round(gs.speed * 100),
      gameOver: gs.gameOver,
      started: gs.started,
      highScore: gs.highScore,
    });
  }, []);

  // Handle input
  const handleInput = useCallback((action: 'left' | 'right' | 'jump' | 'slide') => {
    const gs = gameStateRef.current;
    if (!gs.started) {
      const newGs = startGame(gs);
      gameStateRef.current = newGs;
      syncUI(newGs);
      return;
    }
    const newGs = movePlayer(gs, action);
    gameStateRef.current = newGs;
    syncUI(newGs);
  }, [syncUI]);

  // Restart
  const handleRestart = useCallback(() => {
    const currentHigh = gameStateRef.current.highScore;
    const newGs = createInitialState(currentHigh);
    gameStateRef.current = newGs;
    syncUI(newGs);
  }, [syncUI]);

  // Game loop
  const gameLoop = useCallback((timestamp: number) => {
    if (!lastTimeRef.current) lastTimeRef.current = timestamp;
    const delta = Math.min(timestamp - lastTimeRef.current, 50);
    lastTimeRef.current = timestamp;

    const gs = gameStateRef.current;
    if (gs.started && !gs.gameOver) {
      const newGs = updateGame(gs, delta);
      gameStateRef.current = newGs;
      syncUI(newGs);
    }

    // Draw
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = canvas.clientWidth * (window.devicePixelRatio || 1);
        canvas.height = canvas.clientHeight * (window.devicePixelRatio || 1);
        ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
        drawGame(ctx, gameStateRef.current, canvas.clientWidth, canvas.clientHeight);
      }
    }

    animFrameRef.current = requestAnimationFrame(gameLoop);
  }, [syncUI]);

  // Start game loop
  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [gameLoop]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (keysRef.current.has(e.key)) return;
      keysRef.current.add(e.key);

      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
          handleInput('left');
          break;
        case 'ArrowRight':
        case 'd':
          handleInput('right');
          break;
        case 'ArrowUp':
        case 'w':
        case ' ':
          e.preventDefault();
          handleInput('jump');
          break;
        case 'ArrowDown':
        case 's':
          handleInput('slide');
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleInput]);

  // Touch/swipe controls
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchStartTime = Date.now();
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      const dy = e.changedTouches[0].clientY - touchStartY;
      const dt = Date.now() - touchStartTime;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      // Tap = jump
      if (absDx < 20 && absDy < 20 && dt < 300) {
        handleInput('jump');
        return;
      }

      if (absDx > absDy) {
        // Horizontal swipe
        if (dx > 30) handleInput('right');
        else if (dx < -30) handleInput('left');
      } else {
        // Vertical swipe
        if (dy < -30) handleInput('jump');
        else if (dy > 30) handleInput('slide');
      }
    };

    canvas.addEventListener('touchstart', handleTouchStart, { passive: true });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleInput]);

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-4xl mx-auto px-2">
      {/* HUD */}
      <div className="flex items-center justify-between w-full gap-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-sm font-medium">
            <Trophy className="h-4 w-4 text-yellow-400" />
            <span className="text-muted-foreground">Score:</span>
            <span className="text-foreground tabular-nums">{uiState.score}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm font-medium">
            <Coins className="h-4 w-4 text-yellow-400" />
            <span className="text-muted-foreground">Coins:</span>
            <span className="text-foreground tabular-nums">{uiState.coins}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-sm font-medium">
            <Gauge className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">Speed:</span>
            <span className="text-foreground tabular-nums">{uiState.speed}%</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm font-medium">
            <Zap className="h-4 w-4 text-purple-400" />
            <span className="text-muted-foreground">Best:</span>
            <span className="text-foreground tabular-nums">{uiState.highScore}</span>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative w-full aspect-[4/3] max-h-[70vh] rounded-xl overflow-hidden border border-border glow">
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-pointer"
          style={{ touchAction: 'none' }}
        />

        {/* Start overlay */}
        {!uiState.started && !uiState.gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
            <h2 className="text-3xl font-bold gradient-text mb-2">TEMPLE RUN</h2>
            <p className="text-muted-foreground text-sm mb-6">Endless Runner</p>
            <div className="flex flex-col items-center gap-2">
              <Button
                size="lg"
                onClick={() => handleInput('jump')}
                className="text-base px-8"
              >
                <Zap className="mr-2 h-5 w-5" />
                Tap to Start
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Arrow keys / WASD / Swipe to play
              </p>
            </div>
          </div>
        )}

        {/* Game over overlay */}
        {uiState.gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm">
            <h2 className="text-3xl font-bold text-red-400 mb-2">GAME OVER</h2>
            <div className="flex gap-6 mb-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Score</p>
                <p className="text-2xl font-bold">{uiState.score}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Coins</p>
                <p className="text-2xl font-bold text-yellow-400">{uiState.coins}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Best</p>
                <p className="text-2xl font-bold text-primary">{uiState.highScore}</p>
              </div>
            </div>
            <Button size="lg" onClick={handleRestart} className="text-base px-8">
              <RotateCcw className="mr-2 h-5 w-5" />
              Play Again
            </Button>
          </div>
        )}
      </div>

      {/* Controls help */}
      <Card className="w-full p-3 border-dashed">
        <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <kbd className="rounded border border-border bg-muted px-2 py-0.5 text-xs">
              <ArrowLeft className="inline h-3 w-3" />
            </kbd>
            <span>Left</span>
          </div>
          <div className="flex items-center gap-1.5">
            <kbd className="rounded border border-border bg-muted px-2 py-0.5 text-xs">
              <ArrowRight className="inline h-3 w-3" />
            </kbd>
            <span>Right</span>
          </div>
          <div className="flex items-center gap-1.5">
            <kbd className="rounded border border-border bg-muted px-2 py-0.5 text-xs">
              <ArrowUp className="inline h-3 w-3" />
            </kbd>
            <span>Jump</span>
          </div>
          <div className="flex items-center gap-1.5">
            <kbd className="rounded border border-border bg-muted px-2 py-0.5 text-xs">
              <ArrowDown className="inline h-3 w-3" />
            </kbd>
            <span>Slide</span>
          </div>
          <span className="text-xs text-muted-foreground/60">|</span>
          <span className="text-xs">Swipe to play on mobile</span>
        </div>
      </Card>
    </div>
  );
}
