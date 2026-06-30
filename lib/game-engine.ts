// Game constants and types

export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;
export const LANE_COUNT = 3;
export const LANE_WIDTH = 120;
export const ROAD_WIDTH = LANE_WIDTH * LANE_COUNT;
export const SEGMENT_LENGTH = 200;
export const VISIBLE_SEGMENTS = 40;
export const FOV = 100;
export const CAMERA_HEIGHT = 1000;
export const PLAYER_Z = 0;
export const PLAYER_Y_OFFSET = -150;
export const GRAVITY = 0.6;
export const JUMP_FORCE = -12;
export const PLAYER_SPEED = 0.8;
export const MAX_SPEED = 2.5;
export const SPEED_INCREMENT = 0.001;
export const COIN_SCORE = 10;
export const OBSTACLE_SCORE = 5;

export type Lane = 0 | 1 | 2;
export type Direction = "left" | "right" | "up" | "down";

export interface Player {
  lane: Lane;
  y: number;
  vy: number;
  isJumping: boolean;
  isSliding: boolean;
  slideTimer: number;
  targetX: number;
  currentX: number;
  isMoving: boolean;
}

export interface Obstacle {
  lane: Lane;
  z: number;
  type: "block" | "spike" | "gap";
  width: number;
  height: number;
  passed: boolean;
}

export interface Coin {
  lane: Lane;
  z: number;
  collected: boolean;
}

export interface RoadSegment {
  z: number;
  curve: number;
  hill: number;
}

export interface GameState {
  player: Player;
  obstacles: Obstacle[];
  coins: Coin[];
  roadSegments: RoadSegment[];
  score: number;
  highScore: number;
  distance: number;
  speed: number;
  gameOver: boolean;
  started: boolean;
  coinsCollected: number;
}

export function createInitialState(): GameState {
  const player: Player = {
    lane: 1,
    y: 0,
    vy: 0,
    isJumping: false,
    isSliding: false,
    slideTimer: 0,
    targetX: 0,
    currentX: 0,
    isMoving: false,
  };

  const roadSegments: RoadSegment[] = [];
  for (let i = 0; i < VISIBLE_SEGMENTS; i++) {
    roadSegments.push({
      z: i * SEGMENT_LENGTH,
      curve: 0,
      hill: 0,
    });
  }

  return {
    player,
    obstacles: [],
    coins: [],
    roadSegments,
    score: 0,
    highScore: typeof window !== "undefined" ? parseInt(localStorage.getItem("templeRunHighScore") || "0") : 0,
    distance: 0,
    speed: PLAYER_SPEED,
    gameOver: false,
    started: false,
    coinsCollected: 0,
  };
}

export function project3D(x: number, y: number, z: number, cameraX: number, cameraY: number, screenWidth: number, screenHeight: number) {
  const scale = FOV / (z + FOV);
  return {
    sx: (x - cameraX) * scale + screenWidth / 2,
    sy: (y - cameraY) * scale + screenHeight / 2,
    scale: scale,
  };
}

export function randomLane(): Lane {
  return (Math.floor(Math.random() * 3)) as Lane;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
