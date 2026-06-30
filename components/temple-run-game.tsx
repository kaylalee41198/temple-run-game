"use client";

import React, { useRef, useEffect, useCallback, useState } from 'react';
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
} from '@/lib/game-engine';

export default function TempleRunGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameStateRef = useRef<GameState>(createInitialState());
  const animFrameRef = useRef<number>(0);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loop = () => {
      const state = gameStateRef.current;
      if (state.started && !state.gameOver) {
        gameStateRef.current = updateGame(state);
      }
      renderGame(ctx, gameStateRef.current, dimensions.width, dimensions.height);
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [dimensions]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const state = gameStateRef.current;
      
      if (!state.started && (e.code === 'Space' || e.code === 'Enter')) {
        e.preventDefault();
        gameStateRef.current = startGame(state);
        return;
      }
      
      if (state.gameOver && (e.code === 'Space' || e.code === 'Enter')) {
        e.preventDefault();
        gameStateRef.current = startGame(state);
        return;
      }
      
      switch (e.code) {
        case 'ArrowLeft':
          e.preventDefault();
          gameStateRef.current = moveLeft(gameStateRef.current);
          break;
        case 'ArrowRight':
          e.preventDefault();
          gameStateRef.current = moveRight(gameStateRef.current);
          break;
        case 'ArrowUp':
        case 'Space':
          e.preventDefault();
          gameStateRef.current = jump(gameStateRef.current);
          break;
        case 'ArrowDown':
          e.preventDefault();
          gameStateRef.current = slide(gameStateRef.current);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Touch/swipe controls
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    
    touchStartRef.current = null;
    
    const state = gameStateRef.current;
    
    if (!state.started || state.gameOver) {
      gameStateRef.current = startGame(state);
      return;
    }
    
    if (absDx > absDy && absDx > 30) {
      if (dx > 0) {
        gameStateRef.current = moveRight(gameStateRef.current);
      } else {
        gameStateRef.current = moveLeft(gameStateRef.current);
      }
    } else if (absDy > absDx && absDy > 30) {
      if (dy < 0) {
        gameStateRef.current = jump(gameStateRef.current);
      } else {
        gameStateRef.current = slide(gameStateRef.current);
      }
    }
  }, []);

  // Click/tap to start or restart
  const handleClick = useCallback(() => {
    const state = gameStateRef.current;
    if (!state.started || state.gameOver) {
      gameStateRef.current = startGame(state);
    }
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={dimensions.width}
      height={dimensions.height}
      className="block"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={handleClick}
    />
  );
}