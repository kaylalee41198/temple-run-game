// Temple Run-style 3D endless runner game engine
// Renders a pseudo-3D perspective with lanes, obstacles, coins, and scoring

export interface GameState {
  score: number;
  coins: number;
  speed: number;
  distance: number;
  gameOver: boolean;
  started: boolean;
  playerLane: number; // -1, 0, 1
  playerY: number;    // vertical position (for jump)
  playerState: 'running' | 'jumping' | 'sliding';
  obstacles: Obstacle[];
  coinItems: CoinItem[];
  roadOffset: number;
  highScore: number;
}

interface Obstacle {
  x: number;    // lane -1, 0, 1
  z: number;    // distance ahead
  type: 'wall' | 'spike' | 'gap';
  width: number;
}

interface CoinItem {
  x: number;
  z: number;
  collected: boolean;
}

const LANE_WIDTH = 2;
const ROAD_WIDTH = 6;
const INITIAL_SPEED = 0.15;
const MAX_SPEED = 0.6;
const OBSTACLE_SPAWN_DISTANCE = 80;
const COIN_SPAWN_DISTANCE = 30;
const JUMP_HEIGHT = 3;
const JUMP_DURATION = 600;
const SLIDE_DURATION = 400;

export function createInitialState(highScore: number = 0): GameState {
  return {
    score: 0,
    coins: 0,
    speed: INITIAL_SPEED,
    distance: 0,
    gameOver: false,
    started: false,
    playerLane: 0,
    playerY: 0,
    playerState: 'running',
    obstacles: [],
    coinItems: [],
    roadOffset: 0,
    highScore,
  };
}

export function startGame(state: GameState): GameState {
  return {
    ...createInitialState(state.highScore),
    started: true,
  };
}

export function movePlayer(state: GameState, direction: 'left' | 'right' | 'jump' | 'slide'): GameState {
  if (state.gameOver || !state.started) return state;

  let newState = { ...state };

  if (direction === 'left' && state.playerState === 'running') {
    newState.playerLane = Math.max(-1, state.playerLane - 1);
  } else if (direction === 'right' && state.playerState === 'running') {
    newState.playerLane = Math.min(1, state.playerLane + 1);
  } else if (direction === 'jump' && state.playerState === 'running') {
    newState.playerState = 'jumping';
    newState.playerY = JUMP_HEIGHT;
  } else if (direction === 'slide' && state.playerState === 'running') {
    newState.playerState = 'sliding';
  }

  return newState;
}

function spawnObstacle(distance: number): Obstacle {
  const types: Obstacle['type'][] = ['wall', 'spike', 'gap'];
  const type = types[Math.floor(Math.random() * types.length)];
  const lane = Math.floor(Math.random() * 3) - 1;
  return {
    x: lane,
    z: distance + OBSTACLE_SPAWN_DISTANCE,
    type,
    width: type === 'wall' ? 1 : 0.8,
  };
}

function spawnCoins(distance: number): CoinItem[] {
  const coins: CoinItem[] = [];
  const pattern = Math.floor(Math.random() * 3);
  const z = distance + COIN_SPAWN_DISTANCE;

  if (pattern === 0) {
    // Line of coins in one lane
    const lane = Math.floor(Math.random() * 3) - 1;
    for (let i = 0; i < 5; i++) {
      coins.push({ x: lane, z: z + i * 3, collected: false });
    }
  } else if (pattern === 1) {
    // Arc pattern
    for (let i = 0; i < 3; i++) {
      coins.push({ x: i - 1, z: z + i * 2, collected: false });
    }
  } else {
    // Single coin
    coins.push({ x: Math.floor(Math.random() * 3) - 1, z: z, collected: false });
  }
  return coins;
}

export function updateGame(state: GameState, deltaMs: number): GameState {
  if (state.gameOver || !state.started) return state;

  const dt = deltaMs / 16.67; // normalize to ~60fps
  let newState = { ...state };

  // Increase speed gradually
  newState.speed = Math.min(MAX_SPEED, state.speed + 0.0003 * dt);
  newState.distance = state.distance + state.speed * dt;

  // Update road scroll
  newState.roadOffset = (state.roadOffset + state.speed * dt * 3) % 4;

  // Update player state
  if (state.playerState === 'jumping') {
    // Parabolic jump
    const jumpProgress = (Date.now() % JUMP_DURATION) / JUMP_DURATION;
    if (jumpProgress > 1) {
      newState.playerY = 0;
      newState.playerState = 'running';
    } else {
      newState.playerY = JUMP_HEIGHT * Math.sin(Math.PI * jumpProgress);
    }
  }

  if (state.playerState === 'sliding') {
    const slideProgress = (Date.now() % SLIDE_DURATION) / SLIDE_DURATION;
    if (slideProgress > 1) {
      newState.playerState = 'running';
    }
  }

  // Move obstacles toward player
  newState.obstacles = state.obstacles
    .map(o => ({ ...o, z: o.z - state.speed * dt }))
    .filter(o => o.z > -10);

  // Move coins toward player
  newState.coinItems = state.coinItems
    .map(c => ({ ...c, z: c.z - state.speed * dt }))
    .filter(c => c.z > -10 && !c.collected);

  // Spawn new obstacles
  const lastObstacleZ = state.obstacles.length > 0
    ? Math.max(...state.obstacles.map(o => o.z))
    : 0;

  if (lastObstacleZ < state.distance + OBSTACLE_SPAWN_DISTANCE - 20) {
    newState.obstacles = [...newState.obstacles, spawnObstacle(state.distance)];
    // Sometimes spawn a second obstacle in a different lane further ahead
    if (Math.random() > 0.5) {
      newState.obstacles = [...newState.obstacles, spawnObstacle(state.distance + 15)];
    }
  }

  // Spawn coins
  const lastCoinZ = state.coinItems.length > 0
    ? Math.max(...state.coinItems.map(c => c.z))
    : 0;

  if (lastCoinZ < state.distance + COIN_SPAWN_DISTANCE - 10) {
    newState.coinItems = [...newState.coinItems, ...spawnCoins(state.distance)];
  }

  // Collision detection
  const isJumping = state.playerState === 'jumping' && state.playerY > 1;
  const isSliding = state.playerState === 'sliding';

  for (const obs of newState.obstacles) {
    if (Math.abs(obs.z) < 1.5 && obs.x === state.playerLane) {
      if (obs.type === 'gap') {
        if (!isJumping) {
          newState.gameOver = true;
          break;
        }
      } else if (obs.type === 'wall') {
        if (!isJumping) {
          newState.gameOver = true;
          break;
        }
      } else if (obs.type === 'spike') {
        if (!isJumping && !isSliding) {
          newState.gameOver = true;
          break;
        }
      }
    }
  }

  // Coin collection
  newState.coinItems = newState.coinItems.map(c => {
    if (!c.collected && Math.abs(c.z) < 1.5 && c.x === state.playerLane) {
      newState.coins = state.coins + 1;
      return { ...c, collected: true };
    }
    return c;
  });

  // Update score
  newState.score = Math.floor(newState.distance);

  // Update high score
  if (newState.score > state.highScore) {
    newState.highScore = newState.score;
  }

  return newState;
}

// Helper: draw a rounded rectangle manually (compatible with all browsers)
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// Drawing functions
export function drawGame(ctx: CanvasRenderingContext2D, state: GameState, width: number, height: number) {
  ctx.clearRect(0, 0, width, height);

  // Sky gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, height * 0.6);
  skyGrad.addColorStop(0, '#0f0c29');
  skyGrad.addColorStop(0.5, '#302b63');
  skyGrad.addColorStop(1, '#24243e');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, width, height * 0.6);

  // Ground
  const groundY = height * 0.6;
  const groundGrad = ctx.createLinearGradient(0, groundY, 0, height);
  groundGrad.addColorStop(0, '#2d1b4e');
  groundGrad.addColorStop(1, '#1a0a2e');
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, groundY, width, height - groundY);

  // Draw road (perspective trapezoid)
  const centerX = width / 2;
  const horizonY = height * 0.45;
  const roadTopWidth = width * 0.3;
  const roadBottomWidth = width * 0.9;

  // Road surface
  ctx.beginPath();
  ctx.moveTo(centerX - roadTopWidth / 2, horizonY);
  ctx.lineTo(centerX + roadTopWidth / 2, horizonY);
  ctx.lineTo(centerX + roadBottomWidth / 2, height);
  ctx.lineTo(centerX - roadBottomWidth / 2, height);
  ctx.closePath();

  const roadGrad = ctx.createLinearGradient(0, horizonY, 0, height);
  roadGrad.addColorStop(0, '#3a2a5a');
  roadGrad.addColorStop(1, '#4a3a6a');
  ctx.fillStyle = roadGrad;
  ctx.fill();

  // Road edges
  ctx.strokeStyle = '#6a5a8a';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Lane markings
  const laneOffsets = [-roadBottomWidth / 6, 0, roadBottomWidth / 6];
  for (const offset of laneOffsets) {
    ctx.strokeStyle = '#8a7aaa';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 15]);
    ctx.beginPath();
    ctx.moveTo(centerX + offset - 1, height);
    const topOffset = (offset / (roadBottomWidth / 2)) * (roadTopWidth / 2);
    ctx.lineTo(centerX + topOffset, horizonY);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Draw obstacles
  for (const obs of state.obstacles) {
    if (obs.z < 0 || obs.z > 80) continue;
    const screenZ = projectZ(obs.z, height, horizonY);
    const laneX = projectLaneX(obs.x, screenZ, centerX, roadTopWidth, roadBottomWidth, horizonY, height);

    const size = mapRange(obs.z, 0, 80, 50, 10);

    if (obs.type === 'wall') {
      ctx.fillStyle = '#e74c3c';
      ctx.fillRect(laneX - size / 2, screenZ - size, size, size);
      ctx.strokeStyle = '#c0392b';
      ctx.lineWidth = 2;
      ctx.strokeRect(laneX - size / 2, screenZ - size, size, size);
    } else if (obs.type === 'spike') {
      ctx.fillStyle = '#f39c12';
      ctx.beginPath();
      ctx.moveTo(laneX, screenZ - size);
      ctx.lineTo(laneX - size / 2, screenZ);
      ctx.lineTo(laneX + size / 2, screenZ);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#e67e22';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (obs.type === 'gap') {
      ctx.fillStyle = '#1a0a2e';
      ctx.fillRect(laneX - size / 2 + 5, screenZ - 5, size - 10, 15);
    }
  }

  // Draw coins
  for (const coin of state.coinItems) {
    if (coin.collected || coin.z < 0 || coin.z > 80) continue;
    const screenZ = projectZ(coin.z, height, horizonY);
    const laneX = projectLaneX(coin.x, screenZ, centerX, roadTopWidth, roadBottomWidth, horizonY, height);
    const size = mapRange(coin.z, 0, 80, 20, 5);

    ctx.fillStyle = '#f1c40f';
    ctx.beginPath();
    ctx.arc(laneX, screenZ, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#f39c12';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Glow effect
    const glow = ctx.createRadialGradient(laneX, screenZ, 0, laneX, screenZ, size * 2);
    glow.addColorStop(0, 'rgba(241, 196, 15, 0.3)');
    glow.addColorStop(1, 'rgba(241, 196, 15, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(laneX, screenZ, size * 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw player
  const playerScreenZ = projectZ(0, height, horizonY);
  const playerX = projectLaneX(state.playerLane, playerScreenZ, centerX, roadTopWidth, roadBottomWidth, horizonY, height);
  const playerSize = 30;
  const playerYOffset = state.playerY * 15;

  // Player shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(playerX, playerScreenZ + playerSize / 2, playerSize * 0.6, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  if (state.playerState === 'sliding') {
    // Sliding player (flatter)
    ctx.fillStyle = '#3498db';
    ctx.fillRect(playerX - playerSize / 2, playerScreenZ - playerSize / 3 + playerYOffset, playerSize, playerSize / 2);
    ctx.strokeStyle = '#2980b9';
    ctx.lineWidth = 2;
    ctx.strokeRect(playerX - playerSize / 2, playerScreenZ - playerSize / 3 + playerYOffset, playerSize, playerSize / 2);
  } else {
    // Running player body (manual rounded rect)
    ctx.fillStyle = '#3498db';
    roundRect(ctx, playerX - playerSize / 3, playerScreenZ - playerSize + playerYOffset, playerSize * 2/3, playerSize, 5);
    ctx.fill();
    ctx.strokeStyle = '#2980b9';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Head
    ctx.fillStyle = '#5dade2';
    ctx.beginPath();
    ctx.arc(playerX, playerScreenZ - playerSize - 8 + playerYOffset, 7, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw road stripes (moving)
  const stripeCount = 6;
  for (let i = 0; i < stripeCount; i++) {
    const stripeZ = ((i * 15 + state.roadOffset * 10) % 90) - 10;
    if (stripeZ < 0 || stripeZ > 80) continue;
    const sz = projectZ(stripeZ, height, horizonY);
    const sw = mapRange(stripeZ, 0, 80, 8, 2);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillRect(centerX - sw / 2, sz - 5, sw, 10);
  }
}

function projectZ(z: number, height: number, horizonY: number): number {
  const perspective = 100 / (z + 10);
  return horizonY + (height - horizonY) * (1 - perspective);
}

function projectLaneX(
  lane: number,
  screenZ: number,
  centerX: number,
  roadTopWidth: number,
  roadBottomWidth: number,
  horizonY: number,
  height: number
): number {
  const t = (screenZ - horizonY) / (height - horizonY);
  const roadWidthAtZ = roadTopWidth + (roadBottomWidth - roadTopWidth) * t;
  return centerX + (lane / 3) * roadWidthAtZ;
}

function mapRange(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
  const t = (value - inMin) / (inMax - inMin);
  return outMin + t * (outMax - outMin);
}
