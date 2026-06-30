export type Lane = 0 | 1 | 2;
export type ObstacleType = "wall" | "spike" | "gap";

export interface Obstacle {
  lane: Lane;
  type: ObstacleType;
  z: number; // distance from player (decreases as it approaches)
  width: number;
  height: number;
}

export interface Coin {
  lane: Lane;
  z: number;
  collected: boolean;
}

export interface GameState {
  started: boolean;
  gameOver: boolean;
  score: number;
  highScore: number;
  coins: number;
  speed: number;
  lane: Lane;
  jumping: boolean;
  jumpHeight: number;
  sliding: boolean;
  slideTimer: number;
  obstacles: Obstacle[];
  coinList: Coin[];
  distance: number;
  frameCount: number;
}

const LANE_WIDTH = 120;
const ROAD_WIDTH = 360;
const INITIAL_SPEED = 8;
const MAX_SPEED = 25;
const SPAWN_INTERVAL = 60;
const COIN_SPAWN_INTERVAL = 40;
const GRAVITY = 0.6;
const JUMP_FORCE = -12;
const SLIDE_DURATION = 30;

export function createInitialState(): GameState {
  return {
    started: false,
    gameOver: false,
    score: 0,
    highScore: typeof window !== "undefined" ? parseInt(localStorage.getItem("templeRunHighScore") || "0") : 0,
    coins: 0,
    speed: INITIAL_SPEED,
    lane: 1,
    jumping: false,
    jumpHeight: 0,
    sliding: false,
    slideTimer: 0,
    obstacles: [],
    coinList: [],
    distance: 0,
    frameCount: 0,
  };
}

export function startGame(state: GameState): GameState {
  return {
    ...createInitialState(),
    started: true,
    highScore: state.highScore,
  };
}

function randomLane(): Lane {
  return (Math.floor(Math.random() * 3)) as Lane;
}

function spawnObstacle(state: GameState): Obstacle {
  const types: ObstacleType[] = ["wall", "spike", "gap"];
  const type = types[Math.floor(Math.random() * types.length)];
  return {
    lane: randomLane(),
    type,
    z: -300,
    width: LANE_WIDTH - 20,
    height: type === "spike" ? 30 : 60,
  };
}

function spawnCoin(state: GameState): Coin {
  return {
    lane: randomLane(),
    z: -300,
    collected: false,
  };
}

export function updateGame(state: GameState): GameState {
  const speed = Math.min(state.speed + 0.002, MAX_SPEED);
  let { jumping, jumpHeight, sliding, slideTimer, obstacles, coinList, distance, score, coins, gameOver, frameCount } = state;

  frameCount++;
  distance += speed * 0.1;
  score = Math.floor(distance);

  // Jump physics
  if (jumping) {
    jumpHeight += GRAVITY;
    if (jumpHeight >= 0) {
      jumping = false;
      jumpHeight = 0;
    }
  }

  // Slide timer
  if (sliding) {
    slideTimer--;
    if (slideTimer <= 0) {
      sliding = false;
    }
  }

  // Move obstacles toward player
  obstacles = obstacles
    .map((obs) => ({ ...obs, z: obs.z + speed }))
    .filter((obs) => obs.z < 400); // Remove passed obstacles

  // Move coins toward player
  coinList = coinList
    .map((c) => ({ ...c, z: c.z + speed }))
    .filter((c) => c.z < 400);

  // Spawn new obstacles
  if (frameCount % Math.max(30, Math.floor(SPAWN_INTERVAL - speed * 1.5)) === 0) {
    obstacles.push(spawnObstacle(state));
    // Sometimes spawn a second obstacle in a different lane
    if (Math.random() < 0.3 && speed > 12) {
      const second = spawnObstacle(state);
      second.lane = ((state.lane + 1) % 3) as Lane;
      obstacles.push(second);
    }
  }

  // Spawn coins
  if (frameCount % COIN_SPAWN_INTERVAL === 0) {
    const pattern = Math.floor(Math.random() * 3);
    if (pattern === 0) {
      // Single coin
      coinList.push(spawnCoin(state));
    } else if (pattern === 1) {
      // Line of coins
      for (let i = 0; i < 3; i++) {
        coinList.push({ lane: randomLane(), z: -300 - i * 40, collected: false });
      }
    } else {
      // Arc pattern
      const lanes: Lane[] = [0, 1, 2, 1, 0];
      lanes.forEach((lane, i) => {
        coinList.push({ lane, z: -300 - i * 30, collected: false });
      });
    }
  }

  // Collision detection
  for (const obs of obstacles) {
    if (obs.z > 180 && obs.z < 220 && obs.lane === state.lane) {
      // Check if jumping over
      if (obs.type === "wall" && jumping && jumpHeight < -5) {
        continue; // Jumped over successfully
      }
      if ((obs.type === "spike" || obs.type === "wall") && sliding) {
        continue; // Slid under successfully
      }
      if (obs.type === "gap" && jumping) {
        continue; // Jumped over gap
      }
      gameOver = true;
    }
  }

  // Coin collection
  coinList = coinList.map((c) => {
    if (!c.collected && c.z > 180 && c.z < 220 && c.lane === state.lane) {
      coins++;
      score += 10;
      return { ...c, collected: true };
    }
    return c;
  });

  // Save high score
  if (gameOver && score > state.highScore) {
    if (typeof window !== "undefined") {
      localStorage.setItem("templeRunHighScore", score.toString());
    }
  }

  return {
    ...state,
    speed,
    jumping,
    jumpHeight,
    sliding,
    slideTimer,
    obstacles,
    coinList,
    distance,
    score,
    coins,
    gameOver,
    frameCount,
    highScore: gameOver ? Math.max(score, state.highScore) : state.highScore,
  };
}

export function moveLeft(state: GameState): GameState {
  if (state.lane > 0) {
    return { ...state, lane: (state.lane - 1) as Lane };
  }
  return state;
}

export function moveRight(state: GameState): GameState {
  if (state.lane < 2) {
    return { ...state, lane: (state.lane + 1) as Lane };
  }
  return state;
}

export function jump(state: GameState): GameState {
  if (!state.jumping && !state.sliding) {
    return { ...state, jumping: true, jumpHeight: JUMP_FORCE };
  }
  return state;
}

export function slide(state: GameState): GameState {
  if (!state.jumping && !state.sliding) {
    return { ...state, sliding: true, slideTimer: SLIDE_DURATION };
  }
  return state;
}

export function renderGame(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  canvasWidth: number,
  canvasHeight: number
) {
  // Clear
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const centerX = canvasWidth / 2;
  const groundY = canvasHeight - 100;
  const laneCenter = (lane: Lane) => centerX + (lane - 1) * LANE_WIDTH;

  // Draw road (pseudo-3D perspective)
  const drawRoad = () => {
    const horizonY = canvasHeight * 0.35;
    const roadTopWidth = ROAD_WIDTH * 0.3;
    const roadBottomWidth = ROAD_WIDTH * 1.5;

    // Road surface
    ctx.fillStyle = "#2a2a3e";
    ctx.beginPath();
    ctx.moveTo(centerX - roadTopWidth / 2, horizonY);
    ctx.lineTo(centerX + roadTopWidth / 2, horizonY);
    ctx.lineTo(centerX + roadBottomWidth / 2, canvasHeight);
    ctx.lineTo(centerX - roadBottomWidth / 2, canvasHeight);
    ctx.closePath();
    ctx.fill();

    // Lane dividers
    ctx.strokeStyle = "#ffd700";
    ctx.lineWidth = 2;
    ctx.setLineDash([15, 20]);
    for (let i = 0; i < 2; i++) {
      const t = (i + 1) / 3;
      const xTop = centerX + (t - 0.5) * roadTopWidth;
      const xBottom = centerX + (t - 0.5) * roadBottomWidth;
      ctx.beginPath();
      ctx.moveTo(xTop, horizonY);
      ctx.lineTo(xBottom, canvasHeight);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Road edges
    ctx.strokeStyle = "#8B4513";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(centerX - roadTopWidth / 2, horizonY);
    ctx.lineTo(centerX - roadBottomWidth / 2, canvasHeight);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(centerX + roadTopWidth / 2, horizonY);
    ctx.lineTo(centerX + roadBottomWidth / 2, canvasHeight);
    ctx.stroke();

    // Temple walls on sides
    ctx.fillStyle = "#5c3a1e";
    ctx.fillRect(0, horizonY, centerX - roadBottomWidth / 2 - 10, canvasHeight - horizonY);
    ctx.fillRect(centerX + roadBottomWidth / 2 + 10, horizonY, canvasWidth, canvasHeight - horizonY);

    // Wall details
    ctx.fillStyle = "#7a4f2e";
    for (let y = horizonY; y < canvasHeight; y += 40) {
      const wallWidth = centerX - roadBottomWidth / 2 - 10;
      ctx.fillRect(10, y, wallWidth - 20, 2);
    }
  };

  drawRoad();

  // Draw obstacles
  for (const obs of state.obstacles) {
    const x = laneCenter(obs.lane);
    const zScale = Math.max(0.3, (obs.z + 300) / 500);
    const y = groundY - 80 * zScale;
    const w = obs.width * zScale;
    const h = obs.height * zScale;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(zScale, zScale);

    switch (obs.type) {
      case "wall":
        ctx.fillStyle = "#8B4513";
        ctx.fillRect(-obs.width / 2, -obs.height, obs.width, obs.height);
        ctx.strokeStyle = "#A0522D";
        ctx.lineWidth = 2;
        ctx.strokeRect(-obs.width / 2, -obs.height, obs.width, obs.height);
        // Brick pattern
        ctx.fillStyle = "#A0522D";
        for (let row = 0; row < 3; row++) {
          for (let col = 0; col < 2; col++) {
            ctx.fillRect(
              -obs.width / 2 + col * (obs.width / 2) + 4,
              -obs.height + row * (obs.height / 3) + 4,
              obs.width / 2 - 8,
              obs.height / 3 - 8
            );
          }
        }
        break;
      case "spike":
        ctx.fillStyle = "#FF4444";
        ctx.beginPath();
        ctx.moveTo(0, -obs.height);
        ctx.lineTo(-obs.width / 2, 0);
        ctx.lineTo(obs.width / 2, 0);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#FF6666";
        ctx.beginPath();
        ctx.moveTo(0, -obs.height * 0.7);
        ctx.lineTo(-obs.width / 4, 0);
        ctx.lineTo(obs.width / 4, 0);
        ctx.closePath();
        ctx.fill();
        break;
      case "gap":
        ctx.fillStyle = "#111";
        ctx.fillRect(-obs.width / 2, -5, obs.width, 15);
        ctx.fillStyle = "#FF6600";
        ctx.font = "16px Arial";
        ctx.textAlign = "center";
        ctx.fillText("!!", 0, 8);
        break;
    }

    ctx.restore();
  }

  // Draw coins
  for (const coin of state.coinList) {
    if (coin.collected) continue;
    const x = laneCenter(coin.lane);
    const zScale = Math.max(0.3, (coin.z + 300) / 500);
    const y = groundY - 100 * zScale;
    const r = 10 * zScale;

    ctx.fillStyle = "#FFD700";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#FFA500";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();

    // Shine
    ctx.fillStyle = "#FFF8DC";
    ctx.beginPath();
    ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw player
  const playerX = laneCenter(state.lane);
  const playerY = groundY + (state.jumping ? state.jumpHeight * 3 : 0);
  const playerSize = 30;

  ctx.save();
  ctx.translate(playerX, playerY);

  if (state.sliding) {
    // Sliding player (shorter)
    ctx.fillStyle = "#00BFFF";
    ctx.fillRect(-playerSize, -playerSize / 2, playerSize * 2, playerSize);
    ctx.fillStyle = "#87CEEB";
    ctx.fillRect(-playerSize + 5, -playerSize / 2 + 5, playerSize * 2 - 10, playerSize - 10);
  } else {
    // Running player
    // Body
    ctx.fillStyle = "#00BFFF";
    ctx.fillRect(-playerSize / 2, -playerSize * 1.5, playerSize, playerSize * 1.5);
    // Head
    ctx.beginPath();
    ctx.arc(0, -playerSize * 1.8, playerSize / 2.5, 0, Math.PI * 2);
    ctx.fill();
    // Arms
    ctx.fillStyle = "#0099CC";
    ctx.fillRect(-playerSize / 2 - 8, -playerSize * 1.2, 8, playerSize * 0.6);
    ctx.fillRect(playerSize / 2, -playerSize * 1.2, 8, playerSize * 0.6);
    // Legs
    const legOffset = Math.sin(state.frameCount * 0.3) * 5;
    ctx.fillRect(-playerSize / 2 + 5, 0, 8, playerSize * 0.8 + legOffset);
    ctx.fillRect(playerSize / 2 - 13, 0, 8, playerSize * 0.8 - legOffset);
    // Eyes
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(-5, -playerSize * 1.9, 4, 0, Math.PI * 2);
    ctx.arc(5, -playerSize * 1.9, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(-4, -playerSize * 1.9, 2, 0, Math.PI * 2);
    ctx.arc(6, -playerSize * 1.9, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();

  // HUD
  ctx.fillStyle = "#fff";
  ctx.font = "bold 24px Arial";
  ctx.textAlign = "left";
  ctx.fillText(`Score: ${state.score}`, 20, 40);
  ctx.fillText(`🪙 ${state.coins}`, 20, 70);

  ctx.textAlign = "right";
  ctx.fillStyle = "#FFD700";
  ctx.fillText(`Best: ${state.highScore}`, canvasWidth - 20, 40);

  // Speed indicator
  ctx.textAlign = "right";
  ctx.fillStyle = "#aaa";
  ctx.font = "14px Arial";
  ctx.fillText(`Speed: ${Math.floor(state.speed * 10)}`, canvasWidth - 20, 60);

  // Speed bar
  const barWidth = 100;
  const barHeight = 8;
  const barX = canvasWidth - barWidth - 20;
  const barY = 55;
  const speedRatio = (state.speed - INITIAL_SPEED) / (MAX_SPEED - INITIAL_SPEED);
  ctx.fillStyle = "#333";
  ctx.fillRect(barX, barY, barWidth, barHeight);
  ctx.fillStyle = speedRatio > 0.7 ? "#FF4444" : speedRatio > 0.4 ? "#FFAA00" : "#00FF00";
  ctx.fillRect(barX, barY, barWidth * speedRatio, barHeight);
}
