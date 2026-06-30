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
  if (!state.started || state.gameOver) return state;
  if (state.jumping || state.jumpHeight > 0) return state;
  return { ...state, jumping: true };
}

export function slide(state: GameState): GameState {
  if (!state.started || state.gameOver) return state;
  if (state.sliding) return state;
  return { ...state, sliding: true, slideTimer: 0, jumpHeight: 0 };
}

export function renderGame(ctx: CanvasRenderingContext2D, state: GameState, canvasWidth: number, canvasHeight: number) {
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  
  // Sky gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, canvasHeight * 0.5);
  skyGrad.addColorStop(0, '#1a0a2e');
  skyGrad.addColorStop(0.5, '#2d1b4e');
  skyGrad.addColorStop(1, '#1a0a2e');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight * 0.5);
  
  // Stars
  ctx.fillStyle = '#fff';
  for (let i = 0; i < 50; i++) {
    const sx = (i * 137.5 + 50) % canvasWidth;
    const sy = (i * 97.3 + 20) % (canvasHeight * 0.4);
    const size = 1 + (i % 3);
    ctx.globalAlpha = 0.5 + (i % 5) * 0.1;
    ctx.fillRect(sx, sy, size, size);
  }
  ctx.globalAlpha = 1;
  
  // Ground
  const groundY = canvasHeight * 0.65;
  const horizonY = canvasHeight * 0.5;
  
  // Road - pseudo 3D perspective
  const roadCenterX = canvasWidth / 2;
  const vanishingY = horizonY;
  const vanishingX = roadCenterX;
  
  // Draw road segments
  const segmentCount = 20;
  for (let i = 0; i < segmentCount; i++) {
    const t1 = i / segmentCount;
    const t2 = (i + 1) / segmentCount;
    
    const y1 = vanishingY + (groundY - vanishingY) * t1;
    const y2 = vanishingY + (groundY - vanishingY) * t2;
    
    const roadWidth1 = ROAD_WIDTH * t1;
    const roadWidth2 = ROAD_WIDTH * t2;
    
    const left1 = vanishingX - roadWidth1 / 2;
    const right1 = vanishingX + roadWidth1 / 2;
    const left2 = vanishingX - roadWidth2 / 2;
    const right2 = vanishingX + roadWidth2 / 2;
    
    // Road surface
    const shade = 0.2 + 0.3 * (1 - t1);
    ctx.fillStyle = `rgb(${Math.floor(40 * shade)}, ${Math.floor(40 * shade)}, ${Math.floor(50 * shade)})`;
    ctx.beginPath();
    ctx.moveTo(left1, y1);
    ctx.lineTo(right1, y1);
    ctx.lineTo(right2, y2);
    ctx.lineTo(left2, y2);
    ctx.closePath();
    ctx.fill();
    
    // Road markings (dashed center line)
    if (i % 2 === 0) {
      const center1 = (left1 + right1) / 2 - 2;
      const center2 = (left2 + right2) / 2 - 2;
      ctx.strokeStyle = `rgba(255, 255, 100, ${0.3 + 0.3 * (1 - t1)})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(center1, y1);
      ctx.lineTo(center2, y2);
      ctx.stroke();
    }
    
    // Lane dividers
    for (let lane = 1; lane < LANE_COUNT; lane++) {
      const lx1 = left1 + (roadWidth1 / LANE_COUNT) * lane;
      const lx2 = left2 + (roadWidth2 / LANE_COUNT) * lane;
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.15 + 0.15 * (1 - t1)})`;
      ctx.lineWidth = 1;
      ctx.setLineDash([8, 12]);
      ctx.beginPath();
      ctx.moveTo(lx1, y1);
      ctx.lineTo(lx2, y2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    
    // Temple walls on sides
    ctx.fillStyle = `rgb(${Math.floor(80 * shade)}, ${Math.floor(60 * shade)}, ${Math.floor(40 * shade)})`;
    ctx.fillRect(0, y1, left1, y2 - y1 + 1);
    ctx.fillRect(right1, y1, canvasWidth - right1, y2 - y1 + 1);
  }
  
  // Draw obstacles
  for (const obs of state.obstacles) {
    const t = obs.z / VIEW_DISTANCE;
    if (t <= 0 || t > 1) continue;
    
    const y = vanishingY + (groundY - vanishingY) * (1 - t);
    const roadW = ROAD_WIDTH * (1 - t);
    const laneW = roadW / LANE_COUNT;
    const left = vanishingX - roadW / 2 + obs.lane * laneW;
    const scale = 1 - t;
    
    const w = obs.width * scale;
    const h = obs.height * scale;
    const x = left + (laneW - w) / 2;
    
    if (obs.type === 'wall') {
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(x, y - h, w, h);
      ctx.strokeStyle = '#A0522D';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y - h, w, h);
      // Brick pattern
      ctx.strokeStyle = '#6B3410';
      ctx.lineWidth = 1;
      for (let bx = 0; bx < w; bx += 15 * scale) {
        ctx.beginPath();
        ctx.moveTo(x + bx, y - h);
        ctx.lineTo(x + bx, y);
        ctx.stroke();
      }
      for (let by = 0; by < h; by += 10 * scale) {
        ctx.beginPath();
        ctx.moveTo(x, y - h + by);
        ctx.lineTo(x + w, y - h + by);
        ctx.stroke();
      }
    } else if (obs.type === 'spike') {
      ctx.fillStyle = '#ff4444';
      const spikeCount = 3;
      const spikeW = w / spikeCount;
      ctx.beginPath();
      for (let s = 0; s < spikeCount; s++) {
        const sx = x + s * spikeW;
        ctx.moveTo(sx, y);
        ctx.lineTo(sx + spikeW / 2, y - h);
        ctx.lineTo(sx + spikeW, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#cc0000';
      ctx.lineWidth = 1;
      ctx.stroke();
    } else if (obs.type === 'gap') {
      ctx.fillStyle = '#000';
      ctx.fillRect(x, y - 5, w, 15 * scale + 5);
      ctx.strokeStyle = '#ff6600';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y - 5, w, 15 * scale + 5);
    }
  }
  
  // Draw coins
  for (const coin of state.coinObjects) {
    if (coin.collected) continue;
    const t = coin.z / VIEW_DISTANCE;
    if (t <= 0 || t > 1) continue;
    
    const y = vanishingY + (groundY - vanishingY) * (1 - t);
    const roadW = ROAD_WIDTH * (1 - t);
    const laneW = roadW / LANE_COUNT;
    const left = vanishingX - roadW / 2 + coin.lane * laneW;
    const scale = 1 - t;
    
    const coinSize = 8 * scale;
    const cx = left + laneW / 2;
    const cy = y - 20 * scale;
    
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(cx, cy, coinSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#DAA520';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Shine
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.arc(cx - coinSize * 0.3, cy - coinSize * 0.3, coinSize * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Draw player
  const playerLane = state.lane;
  const playerT = 0.08; // Near the bottom
  const playerY = vanishingY + (groundY - vanishingY) * playerT;
  const roadW = ROAD_WIDTH * playerT;
  const laneW = roadW / LANE_COUNT;
  const playerLeft = vanishingX - roadW / 2 + playerLane * laneW;
  const playerScale = playerT;
  
  const pw = PLAYER_WIDTH * playerScale;
  const ph = PLAYER_HEIGHT * playerScale;
  const px = playerLeft + (laneW - pw) / 2;
  const py = playerY - ph - state.jumpHeight * playerScale;
  
  // Player shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(px + pw / 2, playerY, pw * 0.6, 5 * playerScale, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Player body
  if (state.sliding) {
    // Sliding - shorter
    ctx.fillStyle = '#4FC3F7';
    ctx.fillRect(px, py + ph * 0.3, pw, ph * 0.7);
    ctx.fillStyle = '#29B6F6';
    ctx.fillRect(px - 2, py + ph * 0.3, pw + 4, ph * 0.2);
  } else {
    // Running
    ctx.fillStyle = '#4FC3F7';
    ctx.fillRect(px, py, pw, ph);
    // Head
    ctx.fillStyle = '#FFCC80';
    ctx.beginPath();
    ctx.arc(px + pw / 2, py - 5 * playerScale, 10 * playerScale, 0, Math.PI * 2);
    ctx.fill();
    // Arms
    ctx.fillStyle = '#4FC3F7';
    ctx.fillRect(px - 5 * playerScale, py + 10 * playerScale, 5 * playerScale, 15 * playerScale);
    ctx.fillRect(px + pw, py + 10 * playerScale, 5 * playerScale, 15 * playerScale);
    // Legs
    ctx.fillStyle = '#1565C0';
    const legOffset = Math.sin(state.distance * 0.3) * 5 * playerScale;
    ctx.fillRect(px + 3 * playerScale, py + ph - 5 * playerScale, 8 * playerScale, 15 * playerScale + legOffset);
    ctx.fillRect(px + pw - 11 * playerScale, py + ph - 5 * playerScale, 8 * playerScale, 15 * playerScale - legOffset);
  }
  
  // HUD
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'left';
  ctx.fillText(`Score: ${state.score}`, 20, 40);
  ctx.fillStyle = '#FFD700';
  ctx.fillText(`🪙 ${state.coins}`, 20, 75);
  
  // Speed gauge
  ctx.fillStyle = '#333';
  ctx.fillRect(canvasWidth - 160, 20, 140, 20);
  const speedPercent = (state.speed - INITIAL_SPEED) / (MAX_SPEED - INITIAL_SPEED);
  ctx.fillStyle = speedPercent > 0.7 ? '#ff4444' : speedPercent > 0.4 ? '#ffaa00' : '#44ff44';
  ctx.fillRect(canvasWidth - 158, 22, 136 * speedPercent, 16);
  ctx.fillStyle = '#fff';
  ctx.font = '12px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('SPEED', canvasWidth - 90, 34);
  
  // High score
  if (state.highScore > 0) {
    ctx.fillStyle = '#aaa';
    ctx.font = '16px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(`Best: ${state.highScore}`, canvasWidth - 20, 75);
  }
  
  // Controls hint
  if (state.started && !state.gameOver) {
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('← → to move  |  ↑/Space to jump  |  ↓ to slide', canvasWidth / 2, canvasHeight - 30);
  }
  
  // Game over overlay
  if (state.gameOver) {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    ctx.fillStyle = '#ff4444';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvasWidth / 2, canvasHeight / 2 - 60);
    
    ctx.fillStyle = '#fff';
    ctx.font = '24px Arial';
    ctx.fillText(`Score: ${state.score}`, canvasWidth / 2, canvasHeight / 2);
    ctx.fillStyle = '#FFD700';
    ctx.fillText(`Coins: ${state.coins}`, canvasWidth / 2, canvasHeight / 2 + 35);
    
    if (state.score >= state.highScore && state.score > 0) {
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 20px Arial';
      ctx.fillText('🏆 NEW HIGH SCORE! 🏆', canvasWidth / 2, canvasHeight / 2 + 75);
    }
    
    ctx.fillStyle = '#4FC3F7';
    ctx.font = '20px Arial';
    ctx.fillText('Press SPACE or Tap to Play Again', canvasWidth / 2, canvasHeight / 2 + 120);
  }
  
  // Start screen
  if (!state.started) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 42px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🏃 TEMPLE RUN', canvasWidth / 2, canvasHeight / 2 - 80);
    
    ctx.fillStyle = '#fff';
    ctx.font = '18px Arial';
    ctx.fillText('Dodge obstacles • Collect coins • Survive!', canvasWidth / 2, canvasHeight / 2 - 30);
    
    ctx.fillStyle = '#4FC3F7';
    ctx.font = 'bold 24px Arial';
    ctx.fillText('Press SPACE or Tap to Start', canvasWidth / 2, canvasHeight / 2 + 30);
    
    ctx.fillStyle = '#aaa';
    ctx.font = '16px Arial';
    ctx.fillText('← → or Swipe: Move lanes', canvasWidth / 2, canvasHeight / 2 + 80);
    ctx.fillText('↑ / Space or Swipe Up: Jump', canvasWidth / 2, canvasHeight / 2 + 105);
    ctx.fillText('↓ or Swipe Down: Slide', canvasWidth / 2, canvasHeight / 2 + 130);
  }
}