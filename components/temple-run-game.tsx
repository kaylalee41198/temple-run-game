"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import {
  createInitialState,
  startGame,
  updateGame,
  moveLeft,
  moveRight,
  jump,
  slide,
  renderGame,
  GameState,
} from "@/lib/game-engine";

export default function TempleRunGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>(createInitialState);
  const gameStateRef = useRef<GameState>(gameState);
  const animFrameRef = useRef<number | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

  // Keep ref in sync
  gameStateRef.current = gameState;

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      setCanvasSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let lastTime = performance.now();

    const gameLoop = (time: number) => {
      const dt = time - lastTime;
      lastTime = time;

      if (dt > 100) {
        animFrameRef.current = requestAnimationFrame(gameLoop);
        return;
      }

      const state = gameStateRef.current;

      // Update game state
      if (state.started && !state.gameOver) {
        const newState = updateGame(state);
        gameStateRef.current = newState;
        setGameState(newState);
      }

      // Render
      renderGame(ctx, gameStateRef.current, canvasSize.width, canvasSize.height);

      // Draw start screen
      if (!state.started) {
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

        ctx.fillStyle = "#FFD700";
        ctx.font = "bold 48px Arial";
        ctx.textAlign = "center";
        ctx.fillText("🏃 TEMPLE RUN", canvasSize.width / 2, canvasSize.height / 2 - 80);

        ctx.fillStyle = "#fff";
        ctx.font = "24px Arial";
        ctx.fillText("Press SPACE or Tap to Start", canvasSize.width / 2, canvasSize.height / 2);

        ctx.font = "16px Arial";
        ctx.fillStyle = "#aaa";
        ctx.fillText("← → to move lanes   ↑ / SPACE to jump   ↓ to slide", canvasSize.width / 2, canvasSize.height / 2 + 50);
      }

      // Draw game over overlay
      if (state.gameOver) {
        ctx.fillStyle = "rgba(0,0,0,0.75)";
        ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

        ctx.fillStyle = "#FF4444";
        ctx.font = "bold 48px Arial";
        ctx.textAlign = "center";
        ctx.fillText("GAME OVER", canvasSize.width / 2, canvasSize.height / 2 - 80);

        ctx.fillStyle = "#fff";
        ctx.font = "28px Arial";
        ctx.fillText(`Score: ${state.score}`, canvasSize.width / 2, canvasSize.height / 2 - 20);
        ctx.fillText(`Coins: ${state.coins}`, canvasSize.width / 2, canvasSize.height / 2 + 20);

        ctx.fillStyle = "#FFD700";
        ctx.font = "22px Arial";
        ctx.fillText(`Best: ${state.highScore}`, canvasSize.width / 2, canvasSize.height / 2 + 60);

        ctx.fillStyle = "#fff";
        ctx.font = "20px Arial";
        ctx.fillText("Press SPACE or Tap to Play Again", canvasSize.width / 2, canvasSize.height / 2 + 120);
      }

      animFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [canvasSize]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const state = gameStateRef.current;

      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (state.gameOver || !state.started) {
          setGameState(startGame(state));
          return;
        }
        setGameState(jump(state));
        return;
      }

      if (!state.started || state.gameOver) return;

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          setGameState(moveLeft(gameStateRef.current));
          break;
        case "ArrowRight":
          e.preventDefault();
          setGameState(moveRight(gameStateRef.current));
          break;
        case "ArrowUp":
          e.preventDefault();
          setGameState(jump(gameStateRef.current));
          break;
        case "ArrowDown":
          e.preventDefault();
          setGameState(slide(gameStateRef.current));
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Touch / swipe controls
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const state = gameStateRef.current;
    if (!touchStartRef.current) return;

    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    // Start/restart on tap
    if (Math.abs(dx) < 20 && Math.abs(dy) < 20) {
      if (state.gameOver || !state.started) {
        setGameState(startGame(state));
        return;
      }
      setGameState(jump(state));
      return;
    }

    if (!state.started || state.gameOver) return;

    if (Math.abs(dx) > Math.abs(dy)) {
      // Horizontal swipe
      if (dx > 30) setGameState(moveRight(state));
      else if (dx < -30) setGameState(moveLeft(state));
    } else {
      // Vertical swipe
      if (dy < -30) setGameState(jump(state));
      else if (dy > 30) setGameState(slide(state));
    }
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={canvasSize.width}
      height={canvasSize.height}
      className="block"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    />
  );
}
