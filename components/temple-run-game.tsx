"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  LANE_WIDTH,
  LANE_COUNT,
  ROAD_WIDTH,
  SEGMENT_LENGTH,
  VISIBLE_SEGMENTS,
  FOV,
  CAMERA_HEIGHT,
  GRAVITY,
  JUMP_FORCE,
  PLAYER_SPEED,
  MAX_SPEED,
  SPEED_INCREMENT,
  COIN_SCORE,
  OBSTACLE_SCORE,
  createInitialState,
  project3D,
  randomLane,
  lerp,
  clamp,
  type GameState,
  type Obstacle,
  type Coin,
  type Lane,
} from "@/lib/game-engine";

const COLORS = {
  road: "#3a3a3a",
  roadLight: "#4a4a4a",
  grass: "#2d5a27",
  grassLight: "#3a7a32",
  sky: "#1a1a2e",
  skyLight: "#16213e",
  laneLine: "#ffcc00",
  obstacle: "#8b4513",
  obstacleTop: "#a0522d",
  spike: "#cc3333",
  coin: "#ffd700",
  coinGlow: "#ffed4a",
  player: "#ff6b35",
  playerLight: "#ff8c5a",
  playerDark: "#cc5522",
  text: "#ffffff",
  textShadow: "#000000",
};

export default function TempleRunGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameState>(createInitialState());
  const animRef = useRef<number>(0);
  const keysRef = useRef<Set<string>>(new Set());
  const [gameState, setGameState] = useState<{
    score: number;
    highScore: number;
    gameOver: boolean;
    started: boolean;
    coinsCollected: number;
    distance: number;
  }>({
    score: 0,
    highScore: gameRef.current.highScore,
    gameOver: false,
    started: false,
    coinsCollected: 0,
    distance: 0,
  });

  const spawnObstacle = useCallback((state: GameState) => {
    const lane = randomLane();
    const types: Array<"block" | "spike" | "gap"> = ["block", "spike", "block", "spike", "gap"];
    const type = types[Math.floor(Math.random() * types.length)];
    const obstacle: Obstacle = {
      lane,
      z: state.distance + VISIBLE_SEGMENTS * SEGMENT_LENGTH,
      type,
      width: LANE_WIDTH * 0.7,
      height: type === "spike" ? 40 : 80,
      passed: false,
    };
    state.obstacles.push(obstacle);
  }, []);

  const spawnCoins = useCallback((state: GameState) => {
    const lane = randomLane();
    for (let i = 0; i < 3; i++) {
      const coin: Coin = {
        lane,
        z: state.distance + VISIBLE_SEGMENTS * SEGMENT_LENGTH + i * 100,
        collected: false,
      };
      state.coins.push(coin);
    }
  }, []);

  const resetGame = useCallback(() => {
    const newState = createInitialState();
    gameRef.current = newState;
    setGameState({
      score: 0,
      highScore: newState.highScore,
      gameOver: false,
      started: false,
      coinsCollected: 0,
      distance: 0,
    });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key);
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        const state = gameRef.current;
        if (!state.started) {
          state.started = true;
          setGameState((prev) => ({ ...prev, started: true }));
        } else if (state.gameOver) {
          resetGame();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    // Touch / swipe controls
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      touchStartTime = Date.now();
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStartX;
      const dy = touch.clientY - touchStartY;
      const dt = Date.now() - touchStartTime;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      if (dt < 300 && absDx < 20 && absDy < 20) {
        // Tap
        const state = gameRef.current;
        if (!state.started) {
          state.started = true;
          setGameState((prev) => ({ ...prev, started: true }));
        } else if (state.gameOver) {
          resetGame();
        } else if (!state.player.isJumping) {
          state.player.vy = JUMP_FORCE;
          state.player.isJumping = true;
        }
        return;
      }

      if (absDx > absDy && absDx > 30) {
        if (dx > 0) keysRef.current.add("ArrowRight");
        else keysRef.current.add("ArrowLeft");
        setTimeout(() => {
          keysRef.current.delete("ArrowRight");
          keysRef.current.delete("ArrowLeft");
        }, 100);
      } else if (absDy > absDx && absDy > 30) {
        if (dy > 0) {
          keysRef.current.add("ArrowDown");
          setTimeout(() => keysRef.current.delete("ArrowDown"), 300);
        }
      }
    };

    canvas.addEventListener("touchstart", handleTouchStart);
    canvas.addEventListener("touchend", handleTouchEnd);

    let obstacleTimer = 0;
    let coinTimer = 0;

    const gameLoop = () => {
      const state = gameRef.current;
      const width = canvas!.width;
      const height = canvas!.height;

      ctx!.clearRect(0, 0, width, height);

      // Sky gradient
      const skyGrad = ctx!.createLinearGradient(0, 0, 0, height);
      skyGrad.addColorStop(0, COLORS.sky);
      skyGrad.addColorStop(1, COLORS.skyLight);
      ctx!.fillStyle = skyGrad;
      ctx!.fillRect(0, 0, width, height);

      if (!state.started) {
        // Start screen
        ctx!.fillStyle = "rgba(0,0,0,0.7)";
        ctx!.fillRect(0, 0, width, height);

        ctx!.fillStyle = COLORS.text;
        ctx!.font = `bold ${Math.min(width * 0.08, 64)}px Arial, sans-serif`;
        ctx!.textAlign = "center";
        ctx!.fillText("🏃 Temple Run", width / 2, height * 0.35);

        ctx!.font = `${Math.min(width * 0.025, 20)}px Arial, sans-serif`;
        ctx!.fillStyle = "#ffcc00";
        ctx!.fillText("Press SPACE or Tap to Start", width / 2, height * 0.5);

        ctx!.font = `${Math.min(width * 0.018, 14)}px Arial, sans-serif`;
        ctx!.fillStyle = "#aaaaaa";
        ctx!.fillText("← → Move · ↑ Jump · ↓ Slide", width / 2, height * 0.58);
        ctx!.fillText("Swipe on mobile", width / 2, height * 0.63);

        if (state.highScore > 0) {
          ctx!.font = `${Math.min(width * 0.02, 16)}px Arial, sans-serif`;
          ctx!.fillStyle = "#ffd700";
          ctx!.fillText(`🏆 High Score: ${state.highScore}`, width / 2, height * 0.72);
        }

        animRef.current = requestAnimationFrame(gameLoop);
        return;
      }

      if (state.gameOver) {
        // Game over screen
        ctx!.fillStyle = "rgba(0,0,0,0.75)";
        ctx!.fillRect(0, 0, width, height);

        ctx!.fillStyle = "#ff4444";
        ctx!.font = `bold ${Math.min(width * 0.07, 56)}px Arial, sans-serif`;
        ctx!.textAlign = "center";
        ctx!.fillText("💀 Game Over", width / 2, height * 0.3);

        ctx!.fillStyle = COLORS.text;
        ctx!.font = `${Math.min(width * 0.03, 24)}px Arial, sans-serif`;
        ctx!.fillText(`Score: ${state.score}`, width / 2, height * 0.42);
        ctx!.fillText(`Coins: ${state.coinsCollected}`, width / 2, height * 0.48);
        ctx!.fillText(`Distance: ${Math.floor(state.distance / 10)}m`, width / 2, height * 0.54);

        if (state.score >= state.highScore && state.score > 0) {
          ctx!.fillStyle = "#ffd700";
          ctx!.font = `bold ${Math.min(width * 0.025, 20)}px Arial, sans-serif`;
          ctx!.fillText("🏆 NEW HIGH SCORE!", width / 2, height * 0.62);
        }

        ctx!.fillStyle = "#ffcc00";
        ctx!.font = `${Math.min(width * 0.022, 18)}px Arial, sans-serif`;
        ctx!.fillText("Press SPACE or Tap to Restart", width / 2, height * 0.72);

        animRef.current = requestAnimationFrame(gameLoop);
        return;
      }

      // --- Update ---
      state.speed = Math.min(state.speed + SPEED_INCREMENT, MAX_SPEED);
      state.distance += state.speed;

      // Player movement
      const player = state.player;

      if (keysRef.current.has("ArrowLeft") && player.lane > 0) {
        player.lane = (player.lane - 1) as Lane;
        keysRef.current.delete("ArrowLeft");
      }
      if (keysRef.current.has("ArrowRight") && player.lane < 2) {
        player.lane = (player.lane + 1) as Lane;
        keysRef.current.delete("ArrowRight");
      }
      if ((keysRef.current.has("ArrowUp") || keysRef.current.has(" ")) && !player.isJumping) {
        player.vy = JUMP_FORCE;
        player.isJumping = true;
        keysRef.current.delete("ArrowUp");
        keysRef.current.delete(" ");
      }
      if (keysRef.current.has("ArrowDown") && !player.isJumping) {
        player.isSliding = true;
        player.slideTimer = 30;
        keysRef.current.delete("ArrowDown");
      }

      // Physics
      if (player.isJumping) {
        player.vy += GRAVITY;
        player.y += player.vy;
        if (player.y >= 0) {
          player.y = 0;
          player.vy = 0;
          player.isJumping = false;
        }
      }

      if (player.isSliding) {
        player.slideTimer--;
        if (player.slideTimer <= 0) {
          player.isSliding = false;
        }
      }

      // Smooth lane transition
      const targetX = (player.lane - 1) * LANE_WIDTH;
      player.currentX = lerp(player.currentX, targetX, 0.15);

      // Spawn obstacles and coins
      obstacleTimer += state.speed;
      if (obstacleTimer > SEGMENT_LENGTH * 3) {
        spawnObstacle(state);
        obstacleTimer = 0;
      }

      coinTimer += state.speed;
      if (coinTimer > SEGMENT_LENGTH * 5) {
        spawnCoins(state);
        coinTimer = 0;
      }

      // Move and cull obstacles
      state.obstacles = state.obstacles.filter((obs) => {
        obs.z -= state.speed;
        return obs.z > -200;
      });

      // Move and cull coins
      state.coins = state.coins.filter((coin) => {
        coin.z -= state.speed;
        return coin.z > -200;
      });

      // Collision detection
      const playerZ = 0;
      const playerWidth = 30;
      const playerHeight = player.isSliding ? 30 : 60;

      for (const obs of state.obstacles) {
        if (obs.passed) continue;
        if (obs.z > 50 || obs.z < -50) continue;
        if (obs.lane !== player.lane) continue;
        if (player.isJumping && obs.type !== "gap") continue;
        if (player.isSliding && obs.type === "spike") continue;

        // Collision!
        state.gameOver = true;
        const finalScore = state.score;
        if (finalScore > state.highScore) {
          state.highScore = finalScore;
          if (typeof window !== "undefined") {
            localStorage.setItem("templeRunHighScore", String(finalScore));
          }
        }
        break;
      }

      // Coin collection
      for (const coin of state.coins) {
        if (coin.collected) continue;
        if (coin.z > 30 || coin.z < -30) continue;
        if (coin.lane !== player.lane) continue;
        coin.collected = true;
        state.score += COIN_SCORE;
        state.coinsCollected++;
      }

      // Distance score
      state.score = Math.floor(state.distance / 10) + state.coinsCollected * COIN_SCORE;

      // Update React state periodically
      setGameState({
        score: state.score,
        highScore: state.highScore,
        gameOver: state.gameOver,
        started: state.started,
        coinsCollected: state.coinsCollected,
        distance: Math.floor(state.distance / 10),
      });

      // --- Render ---
      const centerX = width / 2;
      const horizonY = height * 0.45;

      // Draw road segments
      for (let i = 0; i < VISIBLE_SEGMENTS; i++) {
        const segZ = i * SEGMENT_LENGTH;
        const segZ2 = (i + 1) * SEGMENT_LENGTH;

        const p1 = project3D(0, 0, segZ, 0, 0, width, height);
        const p2 = project3D(0, 0, segZ2, 0, 0, width, height);

        if (p1.sy < 0 && p2.sy < 0) continue;

        const roadLeft = centerX - ROAD_WIDTH * p1.scale / 2;
        const roadRight = centerX + ROAD_WIDTH * p1.scale / 2;
        const roadLeft2 = centerX - ROAD_WIDTH * p2.scale / 2;
        const roadRight2 = centerX + ROAD_WIDTH * p2.scale / 2;

        // Grass
        ctx!.fillStyle = i % 2 === 0 ? COLORS.grass : COLORS.grassLight;
        ctx!.beginPath();
        ctx!.moveTo(roadLeft, p1.sy);
        ctx!.lineTo(roadRight, p1.sy);
        ctx!.lineTo(roadRight2, p2.sy);
        ctx!.lineTo(roadLeft2, p2.sy);
        ctx!.closePath();
        ctx!.fill();

        // Road
        ctx!.fillStyle = i % 2 === 0 ? COLORS.road : COLORS.roadLight;
        ctx!.beginPath();
        ctx!.moveTo(roadLeft, p1.sy);
        ctx!.lineTo(roadRight, p1.sy);
        ctx!.lineTo(roadRight2, p2.sy);
        ctx!.lineTo(roadLeft2, p2.sy);
        ctx!.closePath();
        ctx!.fill();

        // Lane lines
        if (i % 3 === 0) {
          for (let lane = 1; lane < LANE_COUNT; lane++) {
            const lx = centerX + (lane - 1.5) * LANE_WIDTH * p1.scale;
            const lx2 = centerX + (lane - 1.5) * LANE_WIDTH * p2.scale;
            ctx!.strokeStyle = COLORS.laneLine;
            ctx!.lineWidth = 2;
            ctx!.beginPath();
            ctx!.moveTo(lx, p1.sy);
            ctx!.lineTo(lx2, p2.sy);
            ctx!.stroke();
          }
        }
      }

      // Draw obstacles
      for (const obs of state.obstacles) {
        if (obs.z < -100) continue;
        const p = project3D(0, 0, obs.z, 0, 0, width, height);
        if (p.sy < 0 || p.sy > height) continue;

        const ox = centerX + (obs.lane - 1) * LANE_WIDTH * p.scale;
        const ow = obs.width * p.scale;
        const oh = obs.height * p.scale;

        if (obs.type === "spike") {
          ctx!.fillStyle = COLORS.spike;
          ctx!.beginPath();
          ctx!.moveTo(ox - ow / 2, p.sy);
          ctx!.lineTo(ox, p.sy - oh);
          ctx!.lineTo(ox + ow / 2, p.sy);
          ctx!.closePath();
          ctx!.fill();
        } else {
          ctx!.fillStyle = COLORS.obstacle;
          ctx!.fillRect(ox - ow / 2, p.sy - oh, ow, oh);
          ctx!.fillStyle = COLORS.obstacleTop;
          ctx!.fillRect(ox - ow / 2, p.sy - oh, ow, oh * 0.2);
        }
      }

      // Draw coins
      for (const coin of state.coins) {
        if (coin.collected || coin.z < -100) continue;
        const p = project3D(0, 0, coin.z, 0, 0, width, height);
        if (p.sy < 0 || p.sy > height) continue;

        const cx = centerX + (coin.lane - 1) * LANE_WIDTH * p.scale;
        const cr = 15 * p.scale;

        // Glow
        ctx!.fillStyle = COLORS.coinGlow;
        ctx!.beginPath();
        ctx!.arc(cx, p.sy, cr * 1.5, 0, Math.PI * 2);
        ctx!.fill();

        // Coin
        ctx!.fillStyle = COLORS.coin;
        ctx!.beginPath();
        ctx!.arc(cx, p.sy, cr, 0, Math.PI * 2);
        ctx!.fill();

        ctx!.fillStyle = "#b8860b";
        ctx!.beginPath();
        ctx!.arc(cx, p.sy, cr * 0.5, 0, Math.PI * 2);
        ctx!.fill();
      }

      // Draw player (runner)
      const playerScreenX = centerX + player.currentX;
      const playerScreenY = horizonY + player.y;
      const playerScale = 1;
      const pw = 30 * playerScale;
      const ph = (player.isSliding ? 20 : 50) * playerScale;

      // Body
      ctx!.fillStyle = COLORS.player;
      ctx!.fillRect(playerScreenX - pw / 2, playerScreenY - ph, pw, ph);

      // Head
      ctx!.fillStyle = COLORS.playerLight;
      ctx!.beginPath();
      ctx!.arc(playerScreenX, playerScreenY - ph - 8, 12, 0, Math.PI * 2);
      ctx!.fill();

      // Legs (running animation)
      const legAnim = Math.sin(state.distance * 0.1) * 8;
      ctx!.fillStyle = COLORS.playerDark;
      ctx!.fillRect(playerScreenX - pw / 2 + 2, playerScreenY - ph / 2 + legAnim, 8, ph / 2);
      ctx!.fillRect(playerScreenX + pw / 2 - 10, playerScreenY - ph / 2 - legAnim, 8, ph / 2);

      // Arms
      const armAnim = Math.sin(state.distance * 0.1 + 1) * 5;
      ctx!.fillStyle = COLORS.playerLight;
      ctx!.fillRect(playerScreenX - pw / 2 - 6, playerScreenY - ph * 0.7 + armAnim, 5, 15);
      ctx!.fillRect(playerScreenX + pw / 2 + 1, playerScreenY - ph * 0.7 - armAnim, 5, 15);

      // HUD
      ctx!.fillStyle = "rgba(0,0,0,0.5)";
      ctx!.fillRect(10, 10, 200, 80);
      ctx!.strokeStyle = "rgba(255,204,0,0.3)";
      ctx!.lineWidth = 1;
      ctx!.strokeRect(10, 10, 200, 80);

      ctx!.fillStyle = COLORS.text;
      ctx!.font = `bold 18px Arial, sans-serif`;
      ctx!.textAlign = "left";
      ctx!.fillText(`🏃 ${state.score}`, 20, 35);
      ctx!.fillStyle = "#ffd700";
      ctx!.font = `14px Arial, sans-serif`;
      ctx!.fillText(`🪙 ${state.coinsCollected}`, 20, 55);
      ctx!.fillStyle = "#88ccff";
      ctx!.fillText(`📏 ${Math.floor(state.distance / 10)}m`, 20, 75);

      // Speed indicator
      const speedPercent = ((state.speed - PLAYER_SPEED) / (MAX_SPEED - PLAYER_SPEED)) * 100;
      ctx!.fillStyle = "rgba(0,0,0,0.5)";
      ctx!.fillRect(width - 160, 10, 150, 25);
      ctx!.fillStyle = speedPercent > 70 ? "#ff4444" : speedPercent > 40 ? "#ffaa00" : "#44ff44";
      ctx!.fillRect(width - 158, 12, (speedPercent / 100) * 146, 21);
      ctx!.fillStyle = COLORS.text;
      ctx!.font = `10px Arial, sans-serif`;
      ctx!.textAlign = "right";
      ctx!.fillText(`SPEED`, width - 15, 28);

      animRef.current = requestAnimationFrame(gameLoop);
    };

    animRef.current = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      canvas!.removeEventListener("touchstart", handleTouchStart);
      canvas!.removeEventListener("touchend", handleTouchEnd);
    };
  }, [spawnObstacle, spawnCoins, resetGame]);

  return (
    <canvas
      ref={canvasRef}
      className="block w-full h-full"
      style={{ touchAction: "none" }}
    />
  );
}
