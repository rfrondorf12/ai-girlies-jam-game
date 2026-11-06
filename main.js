// M2 loop: 8-panel comic runner with spawning monsters, stomp, slash, score, and instant restart.
import {
  PLAYFIELD_W, PLAYFIELD_H, PANEL_MARGIN, GROUND_Y, GROUND_THICKNESS, OUTLINE_WIDTH, MAX_DT,
  GRAVITY, MAX_FALL_SPEED, JUMP_VELOCITY, MAX_JUMPS, DOUBLE_JUMP_VELOCITY,
  MOVE_SPEED, PLAYER_W, PLAYER_H, PLAYER_START_X,
  SHAPE_ROUND, EYE_OFFSET_X, EYE_OFFSET_Y, EYE_RADIUS_X, EYE_RADIUS_Y,
  SLASH_DURATION, SLASH_REACH, SLASH_THICKNESS, SLASH_ARC_SPREAD, SLASH_SAMPLES, SHOULDER_HEIGHT,
  MONSTER_W, MONSTER_H, MONSTER_SPEED, BASE_MONSTERS_PER_PANEL, SPAWN_INTERVAL, SPAWN_PANEL_MULTIPLIER,
  HIT_FLASH, STOMP_SQUASH, STOMP_BOUNCE_VELOCITY,
  PANEL_CLEAR_DELAY, PANEL_CLEAR_SCORE, MONSTER_KILL_SCORE,
  SCORE_FONT_SIZE, PANEL_COUNTER_FONT_SIZE, PANEL_CLEAR_FONT_SIZE,
  VICTORY_FONT_SIZE, VICTORY_TEXT, VICTORY_HINT,
  GAME_OVER_TEXT, RESTART_HINT, GAME_OVER_BANNER_Y, GAME_OVER_FONT_SIZE, GAME_OVER_HINT_SIZE,
  GAME_OVER_HINT_GAP, FONT_STACK,
  CONTROLS_HINT, CONTROLS_HINT_SIZE, CONTROLS_HINT_DURATION, CONTROLS_HINT_MARGIN,
  COLOR_PAPER, COLOR_INK, COLOR_PLAYER, COLOR_EYE, COLOR_MONSTER, COLOR_GROUND,
  COLOR_DEATH, PANEL_FLASH_COLOR,
} from './tuning.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

// player.y is the bottom of the hero (its feet), not its top.
const player = { x: 0, y: 0, vx: 0, vy: 0, facing: 1, grounded: false, slashTimer: 0, jumpsUsed: 0 };
const monsters = [];

let panel = 1;                // current comic panel, 1 through 8
let spawnedThisPanel = 0;     // how many monsters have entered this panel
let spawnTimer = 0;           // countdown to the next spawn
let score = 0;                // run score
let panelClearTimer = 0;      // >0 while "PANEL N CLEARED!" is shown
let gameOver = false;         // run has ended: physics freezes, the panel keeps drawing
let victory = false;          // all 8 panels cleared
let jumpQueued = false;       // a Space / ArrowUp / KeyW press waiting for update() to spend on a jump
let slashQueued = false;      // a '/' press waiting for update() to spend on a swing
let runTime = 0;              // seconds of active run, drives the temporary controls hint
let hasSlashed = false;       // true once the player has swung, which hides the controls hint

function monstersPerPanel(p) {
  return BASE_MONSTERS_PER_PANEL + p;
}

function spawnMonster() {
  monsters.push({
    x: PLAYFIELD_W - PANEL_MARGIN - MONSTER_W / 2,
    y: GROUND_Y,
    w: MONSTER_W,
    h: MONSTER_H,
    dead: false,
    hitTimer: 0,
  });
}

function reset() {
  player.x = PLAYER_START_X;
  player.y = GROUND_Y;
  player.vx = 0;
  player.vy = 0;
  player.facing = 1;
  player.grounded = true;
  player.slashTimer = 0;
  player.jumpsUsed = 0;
  monsters.length = 0;
  panel = 1;
  spawnedThisPanel = 0;
  spawnTimer = 0;
  score = 0;
  panelClearTimer = 0;
  gameOver = false;
  victory = false;
  jumpQueued = false;
  slashQueued = false;
  runTime = 0;
  hasSlashed = false;
}
reset();

// ---------------------------------------------------------------------------
// Input: held keys for movement, single presses for jump and slash
// ---------------------------------------------------------------------------

const held = new Set();
const JUMP_KEYS = new Set(['Space', 'ArrowUp', 'KeyW']);
const BLOCKED = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'Slash', 'KeyW']);

addEventListener('keydown', (e) => {
  if (BLOCKED.has(e.code)) e.preventDefault();
  held.add(e.code);
  if (e.repeat) return;
  // Space, Up arrow and W all jump while running, and retry once the run is over.
  if (JUMP_KEYS.has(e.code)) {
    if (gameOver || victory) reset();
    else jumpQueued = true;
  }
  if (e.code === 'Slash' || e.key === '/') slashQueued = true;
  if (e.code === 'KeyR') reset();
});
addEventListener('keyup', (e) => held.delete(e.code));
addEventListener('blur', () => held.clear());

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

function killMonster(m) {
  if (m.dead) return;
  m.dead = true;
  m.hitTimer = HIT_FLASH;
  score += MONSTER_KILL_SCORE;
}

// The slash arc is sampled into points; if any sample lands inside a live
// monster's AABB expanded by half the arc's thickness, the swing connected.
function slashHitsMonster(m) {
  if (m.dead) return false;
  const shoulderX = player.x;
  const shoulderY = player.y - PLAYER_H * SHOULDER_HEIGHT;
  const pad = SLASH_THICKNESS / 2;
  const left = m.x - m.w / 2 - pad;
  const right = m.x + m.w / 2 + pad;
  const top = m.y - m.h - pad;
  const bottom = m.y + pad;
  const half = SLASH_ARC_SPREAD / 2;

  for (let i = 0; i < SLASH_SAMPLES; i++) {
    const angle = -half + SLASH_ARC_SPREAD * (i / (SLASH_SAMPLES - 1));
    const px = shoulderX + Math.cos(angle) * SLASH_REACH * player.facing;
    const py = shoulderY + Math.sin(angle) * SLASH_REACH;
    if (px >= left && px <= right && py >= top && py <= bottom) return true;
  }
  return false;
}

function updateMonsters(dt) {
  for (const m of monsters) {
    if (!m.dead) {
      m.x -= MONSTER_SPEED * dt;
      // Wrap from the left edge back to the right edge so the player must kill it.
      if (m.x < -m.w / 2) m.x = PLAYFIELD_W - PANEL_MARGIN - m.w / 2;
    }
    m.hitTimer = Math.max(0, m.hitTimer - dt);
  }
  // Dead monsters linger bright for HIT_FLASH seconds, then leave the array.
  for (let i = monsters.length - 1; i >= 0; i--) {
    if (monsters[i].dead && monsters[i].hitTimer <= 0) monsters.splice(i, 1);
  }
}

function advancePanel() {
  score += PANEL_CLEAR_SCORE;
  if (panel >= 8) {
    victory = true;
    return;
  }
  panel++;
  spawnedThisPanel = 0;
  spawnTimer = 0;
  monsters.length = 0;
}

function update(dt) {
  // The run has ended or a panel is being celebrated: hold physics still.
  if (gameOver || victory) return;

  if (panelClearTimer > 0) {
    panelClearTimer = Math.max(0, panelClearTimer - dt);
    if (panelClearTimer <= 0) advancePanel();
    return;
  }

  // --- run ---
  // Only live play counts, so the temporary hint's clock pauses on overlays.
  runTime += dt;

  let dir = 0;
  if (held.has('ArrowLeft') || held.has('KeyA')) dir -= 1;
  if (held.has('ArrowRight') || held.has('KeyD')) dir += 1;
  player.vx = dir * MOVE_SPEED;
  if (dir !== 0) player.facing = dir;
  player.x += player.vx * dt;

  const halfW = PLAYER_W / 2;
  player.x = Math.min(PLAYFIELD_W - halfW, Math.max(halfW, player.x));

  // --- jump ---
  // The first jump uses JUMP_VELOCITY; the second, mid-air tap is weaker.
  if (jumpQueued && player.jumpsUsed < MAX_JUMPS) {
    player.vy = player.jumpsUsed === 0 ? JUMP_VELOCITY : DOUBLE_JUMP_VELOCITY;
    player.grounded = false;
    player.jumpsUsed++;
  }
  jumpQueued = false;

  // --- gravity ---
  const prevBottom = player.y;
  player.vy = Math.min(player.vy + GRAVITY * dt, MAX_FALL_SPEED);
  player.y += player.vy * dt;
  player.grounded = false;

  // --- spawn ---
  spawnTimer -= dt;
  if (spawnTimer <= 0 && spawnedThisPanel < monstersPerPanel(panel)) {
    spawnMonster();
    spawnedThisPanel++;
    spawnTimer = SPAWN_INTERVAL / (1 + (panel - 1) * SPAWN_PANEL_MULTIPLIER);
  }

  updateMonsters(dt);

  // --- stomp ---
  // Falling onto a live monster's top edge kills it and bounces the player.
  for (const m of monsters) {
    if (m.dead) continue;
    const mLeft = m.x - m.w / 2;
    const mRight = m.x + m.w / 2;
    const mTop = m.y - m.h;
    const overlapX = player.x + halfW > mLeft && player.x - halfW < mRight;
    if (overlapX && player.vy > 0 && prevBottom <= mTop && player.y >= mTop) {
      player.y = mTop;
      player.vy = STOMP_BOUNCE_VELOCITY;
      player.grounded = true;
      player.jumpsUsed = 0;
      killMonster(m);
      break;
    }
  }

  // --- ground ---
  if (player.y >= GROUND_Y) {
    player.y = GROUND_Y;
    player.vy = 0;
    player.grounded = true;
    player.jumpsUsed = 0;
  }

  // --- side contact / overlap ---
  // Any overlap with a live monster that wasn't a stomp ends the run.
  for (const m of monsters) {
    if (m.dead) continue;
    const mLeft = m.x - m.w / 2;
    const mRight = m.x + m.w / 2;
    const mTop = m.y - m.h;
    const mBottom = m.y;
    const pLeft = player.x - halfW;
    const pRight = player.x + halfW;
    const pTop = player.y - PLAYER_H;
    const pBottom = player.y;
    if (pRight > mLeft && pLeft < mRight && pBottom > mTop && pTop < mBottom) {
      player.x = player.x < m.x ? mLeft - halfW : mRight + halfW;
      player.vx = 0;
      player.vy = 0;
      gameOver = true;
      return;
    }
  }

  // --- slash ---
  if (slashQueued) {
    player.slashTimer = SLASH_DURATION;
    slashQueued = false;
    hasSlashed = true;
  }
  if (player.slashTimer > 0) {
    player.slashTimer = Math.max(0, player.slashTimer - dt);
    for (const m of monsters) {
      if (!m.dead && slashHitsMonster(m)) killMonster(m);
    }
  }

  // --- panel clear ---
  if (spawnedThisPanel >= monstersPerPanel(panel) && monsters.every((m) => m.dead)) {
    panelClearTimer = PANEL_CLEAR_DELAY;
    jumpQueued = false;
    slashQueued = false;
  }
}

// ---------------------------------------------------------------------------
// Draw
// ---------------------------------------------------------------------------

const view = { scale: 1, x: 0, y: 0 };

function resize() {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const cssW = innerWidth;
  const cssH = innerHeight;
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  view.scale = Math.min(cssW / PLAYFIELD_W, cssH / PLAYFIELD_H) * dpr;
  view.x = (cssW * dpr - PLAYFIELD_W * view.scale) / 2;
  view.y = (cssH * dpr - PLAYFIELD_H * view.scale) / 2;
}
addEventListener('resize', resize);
resize();

// Chunky comic shapes: a polygon with every corner rounded off.
function roundedPath(points, radius) {
  const n = points.length;
  const towards = (from, to) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.hypot(dx, dy);
    return { x: from.x + dx * radius / len, y: from.y + dy * radius / len };
  };
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const cur = points[i];
    const enter = towards(cur, points[(i - 1 + n) % n]);
    const leave = towards(cur, points[(i + 1) % n]);
    if (i === 0) ctx.moveTo(enter.x, enter.y);
    else ctx.lineTo(enter.x, enter.y);
    ctx.arcTo(cur.x, cur.y, leave.x, leave.y, radius);
  }
  ctx.closePath();
}

function drawPanel() {
  ctx.fillStyle = COLOR_PAPER;
  ctx.fillRect(0, 0, PLAYFIELD_W, PLAYFIELD_H);

  // Minimal inking flash while a panel clear is being celebrated.
  if (panelClearTimer > 0) {
    const flash = panelClearTimer / PANEL_CLEAR_DELAY;
    ctx.fillStyle = PANEL_FLASH_COLOR;
    ctx.globalAlpha = 0.15 + flash * 0.25;
    ctx.fillRect(PANEL_MARGIN, PANEL_MARGIN, PLAYFIELD_W - PANEL_MARGIN * 2, PLAYFIELD_H - PANEL_MARGIN * 2);
    ctx.globalAlpha = 1;
  }

  ctx.lineWidth = OUTLINE_WIDTH;
  ctx.strokeStyle = COLOR_INK;
  ctx.strokeRect(PANEL_MARGIN, PANEL_MARGIN, PLAYFIELD_W - PANEL_MARGIN * 2, PLAYFIELD_H - PANEL_MARGIN * 2);

  ctx.fillStyle = COLOR_GROUND;
  ctx.fillRect(PANEL_MARGIN, GROUND_Y, PLAYFIELD_W - PANEL_MARGIN * 2, GROUND_THICKNESS);
}

function drawMonsters() {
  for (const m of monsters) {
    // Dead monsters stay bright for HIT_FLASH seconds before disappearing.
    if (m.dead && m.hitTimer <= 0) continue;
    const squash = m.hitTimer > 0 && !m.dead ? STOMP_SQUASH * (m.hitTimer / HIT_FLASH) : 0;
    const h = m.h * (1 - squash);
    const x = m.x - m.w / 2;
    const y = m.y - h;
    ctx.fillStyle = m.hitTimer > 0 ? COLOR_EYE : COLOR_MONSTER;
    ctx.fillRect(x, y, m.w, h);
    ctx.lineWidth = OUTLINE_WIDTH;
    ctx.strokeStyle = COLOR_INK;
    ctx.strokeRect(x, y, m.w, h);
  }
}

function drawPlayer() {
  const w = PLAYER_W;
  const h = PLAYER_H;
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.scale(player.facing, 1);
  ctx.lineJoin = 'round';
  ctx.lineWidth = OUTLINE_WIDTH;
  ctx.strokeStyle = COLOR_INK;

  // The Missing Piece: a rounded wedge whose point is the direction of travel.
  roundedPath([{ x: -w / 2, y: -h }, { x: w / 2, y: -h / 2 }, { x: -w / 2, y: 0 }], Math.min(w, h) * SHAPE_ROUND);
  ctx.fillStyle = gameOver ? COLOR_DEATH : COLOR_PLAYER;
  ctx.fill();
  ctx.stroke();

  // One big cream oval eye.
  ctx.beginPath();
  ctx.ellipse(w * EYE_OFFSET_X, h * EYE_OFFSET_Y, w * EYE_RADIUS_X, h * EYE_RADIUS_Y, 0, 0, Math.PI * 2);
  ctx.fillStyle = COLOR_EYE;
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawSlash() {
  if (player.slashTimer <= 0) return;
  ctx.save();
  ctx.translate(player.x, player.y - PLAYER_H * SHOULDER_HEIGHT);
  ctx.scale(player.facing, 1);
  ctx.globalAlpha = player.slashTimer / SLASH_DURATION;
  ctx.strokeStyle = COLOR_INK;
  ctx.lineWidth = SLASH_THICKNESS;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, 0, SLASH_REACH, -SLASH_ARC_SPREAD / 2, SLASH_ARC_SPREAD / 2);
  ctx.stroke();
  ctx.restore();
}

function drawScore() {
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = `${SCORE_FONT_SIZE}px ${FONT_STACK}`;
  ctx.lineWidth = OUTLINE_WIDTH;
  ctx.strokeStyle = COLOR_INK;
  const text = `SCORE: ${score}`;
  const x = PANEL_MARGIN + 12;
  const y = PANEL_MARGIN + 8;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = COLOR_INK;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function drawPanelCounter() {
  ctx.save();
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.font = `${PANEL_COUNTER_FONT_SIZE}px ${FONT_STACK}`;
  ctx.lineWidth = OUTLINE_WIDTH;
  ctx.strokeStyle = COLOR_INK;
  const text = `PANEL ${panel}/8`;
  const x = PLAYFIELD_W - PANEL_MARGIN - 12;
  const y = PANEL_MARGIN + 10;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = COLOR_INK;
  ctx.fillText(text, x, y);
  ctx.restore();
}

// A temporary nudge line in the bottom-left of the panel: it goes away as soon
// as the player has slashed once, or after CONTROLS_HINT_DURATION seconds.
function drawControlsHint() {
  if (hasSlashed || runTime >= CONTROLS_HINT_DURATION) return;
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.font = `${CONTROLS_HINT_SIZE}px ${FONT_STACK}`;
  ctx.lineWidth = OUTLINE_WIDTH;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = COLOR_INK;
  const x = PANEL_MARGIN + CONTROLS_HINT_MARGIN;
  const y = PLAYFIELD_H - PANEL_MARGIN - CONTROLS_HINT_MARGIN;
  ctx.strokeText(CONTROLS_HINT, x, y);
  ctx.fillStyle = COLOR_INK;
  ctx.fillText(CONTROLS_HINT, x, y);
  ctx.restore();
}

function drawPanelClear() {
  if (panelClearTimer <= 0) return;
  const cx = PLAYFIELD_W / 2;
  const cy = PLAYFIELD_H / 2;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = COLOR_INK;
  ctx.font = `${PANEL_CLEAR_FONT_SIZE}px ${FONT_STACK}`;
  ctx.lineWidth = OUTLINE_WIDTH * 2.5;
  const text = `PANEL ${panel} CLEARED!`;
  ctx.strokeText(text, cx, cy);
  ctx.fillStyle = COLOR_EYE;
  ctx.fillText(text, cx, cy);
  ctx.restore();
}

// The end-of-run marker: inked "GAME OVER" plus the retry prompt, centred in the panel.
function drawGameOver() {
  if (!gameOver) return;
  const cx = PLAYFIELD_W / 2;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = COLOR_INK;

  ctx.font = `${GAME_OVER_FONT_SIZE}px ${FONT_STACK}`;
  ctx.lineWidth = OUTLINE_WIDTH * 3;
  ctx.strokeText(GAME_OVER_TEXT, cx, GAME_OVER_BANNER_Y);
  ctx.fillStyle = COLOR_DEATH;
  ctx.fillText(GAME_OVER_TEXT, cx, GAME_OVER_BANNER_Y);

  ctx.font = `${GAME_OVER_HINT_SIZE}px ${FONT_STACK}`;
  ctx.lineWidth = OUTLINE_WIDTH * 1.5;
  const hintY = GAME_OVER_BANNER_Y + GAME_OVER_HINT_GAP;
  ctx.strokeText(RESTART_HINT, cx, hintY);
  ctx.fillStyle = COLOR_INK;
  ctx.fillText(RESTART_HINT, cx, hintY);
  ctx.restore();
}

function drawVictory() {
  if (!victory) return;
  const cx = PLAYFIELD_W / 2;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = COLOR_INK;

  ctx.font = `${VICTORY_FONT_SIZE}px ${FONT_STACK}`;
  ctx.lineWidth = OUTLINE_WIDTH * 3;
  ctx.strokeText(VICTORY_TEXT, cx, GAME_OVER_BANNER_Y);
  ctx.fillStyle = COLOR_PLAYER;
  ctx.fillText(VICTORY_TEXT, cx, GAME_OVER_BANNER_Y);

  ctx.font = `${GAME_OVER_HINT_SIZE}px ${FONT_STACK}`;
  ctx.lineWidth = OUTLINE_WIDTH * 1.5;
  const scoreY = GAME_OVER_BANNER_Y + GAME_OVER_HINT_GAP;
  const scoreText = `FINAL SCORE: ${score}`;
  ctx.strokeText(scoreText, cx, scoreY);
  ctx.fillStyle = COLOR_INK;
  ctx.fillText(scoreText, cx, scoreY);

  const hintY = scoreY + GAME_OVER_HINT_GAP;
  ctx.strokeText(VICTORY_HINT, cx, hintY);
  ctx.fillStyle = COLOR_INK;
  ctx.fillText(VICTORY_HINT, cx, hintY);
  ctx.restore();
}

function draw() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = COLOR_PAPER;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);

  drawPanel();
  drawMonsters();
  drawPlayer();
  drawSlash();
  drawScore();
  drawPanelCounter();
  drawControlsHint();
  drawPanelClear();
  drawGameOver();
  drawVictory();
}

// ---------------------------------------------------------------------------
// Loop
// ---------------------------------------------------------------------------

let lastTime = performance.now();
function frame(now) {
  const dt = Math.min((now - lastTime) / 1000, MAX_DT);
  lastTime = now;
  update(dt);
  draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
