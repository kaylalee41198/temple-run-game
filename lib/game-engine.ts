// Temple Run-style game engine
// Pure canvas rendering with pseudo-3D perspective

export interface GameState {
  score: number;
  coins: number;
  speed: number;
  gameOver: boolean;
  started: boolean;
  highScore: number;
  lane: number; // 0, 1, 2
  jumping: boolean;
  jumpHeight: number;
  sliding: boolean;
  slideTimer: number;
  obstacles: Obstacle[];
  coinObjects: CoinObject[];
  roadOffset: number;
  distance: number;
}

export interface Obstacle {
  lane: number;
  type: 'wall' | 'spike' | 'gap';
  z: number; // distance from player
  width: number;
  height: number;
}

export interface CoinObject {
  lane: number;
  z: number;
  collected: boolean;
  pattern: 'single' | 'line' | 'arc';
  index: number;
}

const LANE_COUNT = 3;
const LANE_WIDTH = 120;
const ROAD_WIDTH = LANE_COUNT * LANE_WIDTH;
const INITIAL_SPEED = 6;
const MAX_SPEED = 20;
const SPEED_INCREMENT = 0.001;
const OBSTACLE_SPAWN_INTERVAL = 40;
const COIN_SPAWN_INTERVAL = 30;
const JUMP_FORCE = 12;
const GRAVITY = 0.6;
const SLIDE_DURATION = 30;
const VIEW_DISTANCE = 400;
const PLAYER_HEIGHT = 80;
const PLAYER_WIDTH = 40;

export function createInitialState(): GameState {
  const savedHighScore = typeof window !== 'undefined' ? parseInt(localStorage.getItem('templeRunHighScore') || '0', 10) : 0;
  return {
    score: 0,
    coins: 0,
    speed: INITIAL_SPEED,
    gameOver: false,
    started: false,
    highScore: savedHighScore,
    lane: 1,
    jumping: false,
    jumpHeight: 0,
    sliding: false,
    slideTimer: 0,
    obstacles: [],
    coinObjects: [],
    roadOffset: 0,
    distance: 0,
  };
}

export function startGame(state: GameState): GameState {
  return {
    ...createInitialState(),
    started: true,
    highScore: state.highScore,
  };
}

export function updateGame(state: GameState): GameState {
  if (!state.started || state.gameOver) return state;

  let newState = { ...state };

  // Increase speed
  newState.speed = Math.min(state.speed + SPEED_INCREMENT, MAX_SPEED);

  // Update distance/score
  newState.distance = state.distance + state.speed * 0.1;
  newState.score = Math.floor(newState.distance);

  // Road scroll
  newState.roadOffset = (state.roadOffset + state.speed) % 200;

  // Jump physics
  if (state.jumping) {
    newState.jumpHeight = state.jumpHeight + JUMP_FORCE;
    if (newState.jumpHeight > 100) {
      newState.jumping = false;
    }
  } else if (state.jumpHeight > 0) {
    newState.jumpHeight = state.jumpHeight - GRAVITY;
    if (newState.jumpHeight < 0) newState.jumpHeight = 0;
  }

  // Slide timer
  if (state.sliding) {
    newState.slideTimer = state.slideTimer + 1;
    if (newState.slideTimer >= SLIDE_DURATION) {
      newState.sliding = false;
      newState.slideTimer = 0;
    }
  }

  // Move obstacles toward player
  newState.obstacles = state.obstacles
    .map(obs => ({ ...obs, z: obs.z - state.speed }))
    .filter(obs => obs.z > -50);

  // Move coins toward player
  newState.coinObjects = state.coinObjects
    .map(coin => ({ ...coin, z: coin.z - state.speed }))
    .filter(coin => coin.z > -50 && !coin.collected);

  // Spawn obstacles
  const shouldSpawnObstacle = Math.random() < (state.speed / OBSTACLE_SPAWN_INTERVAL / 10);
  if (shouldSpawnObstacle && newState.obstacles.length < 5) {
    const types: ('wall' | 'spike' | 'gap')[] = ['wall', 'spike', 'gap'];
    const type = types[Math.floor(Math.random() * types.length)];
    const lane = Math.floor(Math.random() * LANE_COUNT);
    newState.obstacles.push({
      lane,
      type,
      z: VIEW_DISTANCE,
      width: LANE_WIDTH * 0.8,
      height: type === 'wall' ? 60 : type === 'spike' ? 30 : 20,
    });
  }

  // Spawn coins
  const shouldSpawnCoin = Math.random() < (state.speed / COIN_SPAWN_INTERVAL / 10);
  if (shouldSpawnCoin) {
    const pattern: 'single' | 'line' | 'arc' = Math.random() < 0.5 ? 'single' : Math.random() < 0.7 ? 'line' : 'arc';
    if (pattern === 'single') {
      newState.coinObjects.push({
        lane: Math.floor(Math.random() * LANE_COUNT),
        z: VIEW_DISTANCE,
        collected: false,
        pattern: 'single',
        index: 0,
      });
    } else if (pattern === 'line') {
      const lane = Math.floor(Math.random() * LANE_COUNT);
      for (let i = 0; i < 5; i++) {
        newState.coinObjects.push({
          lane,
          z: VIEW_DISTANCE + i * 20,
          collected: false,
          pattern: 'line',
          index: i,
        });
      }
    } else {
      for (let i = 0; i < 3; i++) {
        newState.coinObjects.push({
          lane: i,
          z: VIEW_DISTANCE + i * 15,
          collected: false,
          pattern: 'arc',
          index: i,
        });
      }
    }
  }

  // Collision detection
  for (const obs of newState.obstacles) {
    if (obs.z < 30 && obs.z > -10 && obs.lane === state.lane) {
      if (obs.type === 'wall' && state.jumpHeight < 40) {
        newState.gameOver = true;
        break;
      }
      if (obs.type === 'spike' && !state.jumping && !state.sliding && state.jumpHeight < 10) {
        newState.gameOver = true;
        break;
      }
      if (obs.type === 'gap' && !state.jumping && state.jumpHeight < 20) {
        newState.gameOver = true;
        break;
      }
    }
  }

  // Coin collection
  for (const coin of newState.coinObjects) {
    if (!coin.collected && coin.z < 20 && coin.z > -10 && coin.lane === state.lane) {
      coin.collected = true;
      newState.coins = state.coins + 1;
    }
  }

  // Update high score
  if (newState.gameOver && newState.score > state.highScore) {
    newState.highScore = newState.score;
    if (typeof window !== 'undefined') {
      localStorage.setItem('templeRunHighScore', String(newState.score));
    }
  }

  return newState;
}

export function moveLeft(state: GameState): GameState {
  if (!state.started || state.gameOver) return state;
  return { ...state, lane: Math.max(0, state.lane - 1) };
}

export function moveRight(state: GameState): GameState {
  if (!state.started || state.gameOver) return state;
  return { ...state, lane: Math.min(LANE_COUNT - 1, state.lane + 1) };
}

export function jump(state: GameState): GameState {
  if (!state.started || state.gameOver || state.jumping || state.jumpHeight > 0) return state;
  return { ...state, jumping: true };
}

export function slide(state: GameState): GameState {
  if (!state.started || state.gameOver || state.sliding) return state;
  return { ...state, sliding: true, slideTimer: 0 };
}

// 3D perspective projection
function projectToScreen(worldX: number, worldZ: number, canvasWidth: number, canvasHeight: number): { sx: number; sy: number; scale: number } {
  const horizonY = canvasHeight * 0.4;
  const perspective = 300 / (worldZ + 100);
  const sx = canvasWidth / 2 + worldX * perspective;
  const sy = horizonY + 200 * perspective;
  return { sx, sy, scale: perspective };
}

export function renderGame(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  canvasWidth: number,
  canvasHeight: number
): void {
  // Clear
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const horizonY = canvasHeight * 0.4;

  // Sky gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
  skyGrad.addColorStop(0, '#1a1a2e');
  skyGrad.addColorStop(0.5, '#16213e');
  skyGrad.addColorStop(1, '#0f3460');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, canvasWidth, horizonY);

  // Ground / road
  const roadGrad = ctx.createLinearGradient(0, horizonY, 0, canvasHeight);
  roadGrad.addColorStop(0, '#4a4a4a');
  roadGrad.addColorStop(0.3, '#3a3a3a');
  roadGrad.addColorStop(1, '#2a2a2a');
  ctx.fillStyle = roadGrad;
  ctx.fillRect(0, horizonY, canvasWidth, canvasHeight - horizonY);

  // Draw road segments with perspective
  const numSegments = 30;
  for (let i = 0; i < numSegments; i++) {
    const z = (i / numSegments) * VIEW_DISTANCE;
    const nextZ = ((i + 1) / numSegments) * VIEW_DISTANCE;

    const left = projectToScreen(-ROAD_WIDTH / 2, z, canvasWidth, canvasHeight);
    const leftNext = projectToScreen(-ROAD_WIDTH / 2, nextZ, canvasWidth, canvasHeight);
    const right = projectToScreen(ROAD_WIDTH / 2, z, canvasWidth, canvasHeight);
    const rightNext = projectToScreen(ROAD_WIDTH / 2, nextZ, canvasWidth, canvasHeight);

    // Road surface
    ctx.fillStyle = (Math.floor(i + state.roadOffset / 10) % 2 === 0) ? '#555' : '#4a4a4a';
    ctx.beginPath();
    ctx.moveTo(left.sx, left.sy);
    ctx.lineTo(right.sx, right.sy);
    ctx.lineTo(rightNext.sx, rightNext.sy);
    ctx.lineTo(leftNext.sx, leftNext.sy);
    ctx.closePath();
    ctx.fill();

    // Lane dividers
    for (let lane = 1; lane < LANE_COUNT; lane++) {
      const x = -ROAD_WIDTH / 2 + lane * LANE_WIDTH;
      const p1 = projectToScreen(x, z, canvasWidth, canvasHeight);
      const p2 = projectToScreen(x, nextZ, canvasWidth, canvasHeight);
      ctx.strokeStyle = (Math.floor(i + state.roadOffset / 5) % 2 === 0) ? '#ffcc00' : '#888';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p1.sx, p1.sy);
      ctx.lineTo(p2.sx, p2.sy);
      ctx.stroke();
    }

    // Temple walls on sides
    const wallLeft = projectToScreen(-ROAD_WIDTH / 2 - 30, z, canvasWidth, canvasHeight);
    const wallLeftNext = projectToScreen(-ROAD_WIDTH / 2 - 30, nextZ, canvasWidth, canvasHeight);
    const wallRight = projectToScreen(ROAD_WIDTH / 2 + 30, z, canvasWidth, canvasHeight);
    const wallRightNext = projectToScreen(ROAD_WIDTH / 2 + 30, nextZ, canvasWidth, canvasHeight);

    ctx.fillStyle = '#8B7355';
    ctx.fillRect(wallLeft.sx, wallLeft.sy - 40 * left.scale, wallLeftNext.sx - wallLeft.sx, 40 * left.scale);
    ctx.fillRect(wallRight.sx, wallRight.sy - 40 * right.scale, wallRightNext.sx - wallRight.sx, 40 * right.scale);
  }

  // Draw obstacles
  for (const obs of state.obstacles) {
    const laneX = -ROAD_WIDTH / 2 + obs.lane * LANE_WIDTH + LANE_WIDTH / 2;
    const pos = projectToScreen(laneX, obs.z, canvasWidth, canvasHeight);
    const w = obs.width * pos.scale;
    const h = obs.height * pos.scale;

    if (obs.type === 'wall') {
      ctx.fillStyle = '#8B0000';
      ctx.fillRect(pos.sx - w / 2, pos.sy - h, w, h);
      ctx.strokeStyle = '#FF4444';
      ctx.lineWidth = 2;
      ctx.strokeRect(pos.sx - w / 2, pos.sy - h, w, h);
    } else if (obs.type === 'spike') {
      ctx.fillStyle = '#FF6600';
      ctx.beginPath();
      ctx.moveTo(pos.sx, pos.sy - h);
      ctx.lineTo(pos.sx - w / 2, pos.sy);
      ctx.lineTo(pos.sx + w / 2, pos.sy);
      ctx.closePath();
      ctx.fill();
    } else if (obs.type === 'gap') {
      ctx.fillStyle = '#111';
      ctx.fillRect(pos.sx - w / 2, pos.sy - 5, w, 10);
    }
  }

  // Draw coins
  for (const coin of state.coinObjects) {
    if (coin.collected) continue;
    const laneX = -ROAD_WIDTH / 2 + coin.lane * LANE_WIDTH + LANE_WIDTH / 2;
    const pos = projectToScreen(laneX, coin.z, canvasWidth, canvasHeight);
    const r = 8 * pos.scale;

    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(pos.sx, pos.sy - r, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#FFA500';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(pos.sx, pos.sy - r, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Draw player
  const playerLaneX = -ROAD_WIDTH / 2 + state.lane * LANE_WIDTH + LANE_WIDTH / 2;
  const playerPos = projectToScreen(playerLaneX, 20, canvasWidth, canvasHeight);
  const playerScale = playerPos.scale;
  const pW = PLAYER_WIDTH * playerScale;
  const pH = PLAYER_HEIGHT * playerScale;
  const jumpOffset = state.jumpHeight * playerScale;
  const playerY = playerPos.sy - pH - jumpOffset;

  // Player body
  ctx.fillStyle = '#00BFFF';
  ctx.fillRect(playerPos.sx - pW / 2, playerY, pW, pH);

  // Player head
  ctx.fillStyle = '#FFD700';
  ctx.beginPath();
  ctx.arc(playerPos.sx, playerY - 5 * playerScale, 10 * playerScale, 0, Math.PI * 2);
  ctx.fill();

  // Sliding visual
  if (state.sliding) {
    ctx.fillStyle = '#00BFFF';
    ctx.fillRect(playerPos.sx - pW / 2, playerY + pH * 0.3, pW, pH * 0.5);
  }

  // HUD
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 20px Arial';
  ctx.textAlign = 'left';
  ctx.fillText(`Score: ${state.score}`, 20, 40);
  ctx.fillText(`Coins: ${state.coins}`, 20, 70);
  ctx.fillText(`Speed: ${Math.floor(state.speed * 10)}`, 20, 100);

  ctx.textAlign = 'right';
  ctx.fillText(`Best: ${state.highScore}`, canvasWidth - 20, 40);

  // Speed bar
  const barWidth = 150;
  const barHeight = 8;
  const barX = canvasWidth - barWidth - 20;
  const barY = 55;
  const speedRatio = (state.speed - INITIAL_SPEED) / (MAX_SPEED - INITIAL_SPEED);
  ctx.fillStyle = '#333';
  ctx.fillRect(barX, barY, barWidth, barHeight);
  ctx.fillStyle = speedRatio > 0.7 ? '#FF4444' : speedRatio > 0.4 ? '#FFAA00' : '#00FF00';
  ctx.fillRect(barX, barY, barWidth * speedRatio, barHeight);
}
