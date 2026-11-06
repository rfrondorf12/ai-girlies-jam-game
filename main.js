// M3 feel: 8-panel comic runner with spawning monsters, stomp, slash, score, instant restart, and procedural Web Audio SFX.
import {
  PLAYFIELD_W, PLAYFIELD_H, PANEL_MARGIN, GROUND_Y, GROUND_THICKNESS, OUTLINE_WIDTH, TEXT_OUTLINE_WIDTH, MAX_DT,
  GRAVITY, MAX_FALL_SPEED, JUMP_VELOCITY, MAX_JUMPS, DOUBLE_JUMP_VELOCITY,
  MOVE_SPEED, PLAYER_W, PLAYER_H, PLAYER_START_X,
  SHAPE_ROUND, EYE_OFFSET_X, EYE_OFFSET_Y, EYE_RADIUS_X, EYE_RADIUS_Y,
  SLASH_DURATION, SLASH_REACH, SLASH_THICKNESS, SLASH_ARC_SPREAD, SLASH_SAMPLES, SHOULDER_HEIGHT,
  MONSTER_W, MONSTER_H, MONSTER_SPEED, BASE_MONSTERS_PER_PANEL, SPAWN_INTERVAL, SPAWN_PANEL_MULTIPLIER,
  HIT_FLASH, STOMP_SQUASH, STOMP_BOUNCE_VELOCITY,
  PANEL_CLEAR_DELAY, PANEL_CLEAR_SCORE, MONSTER_KILL_SCORE,
  SCORE_FONT_SIZE, PANEL_COUNTER_FONT_SIZE, PANEL_CLEAR_FONT_SIZE,
  VICTORY_FONT_SIZE, VICTORY_TEXT,
  GAME_OVER_TEXT, RESTART_HINT_LINE1, RESTART_HINT_LINE2, GAME_OVER_BANNER_Y, GAME_OVER_FONT_SIZE, GAME_OVER_HINT_SIZE,
  GAME_OVER_HINT_GAP, FONT_STACK,
  VICTORY_HINT_LINE1, VICTORY_HINT_LINE2,
  PAUSED_TEXT, PAUSED_HINT, PAUSED_FONT_SIZE,
  CONTROLS_HINT, CONTROLS_HINT_SIZE, CONTROLS_HINT_DURATION, CONTROLS_HINT_MARGIN,
  COLOR_PAPER, COLOR_INK, COLOR_PLAYER, COLOR_EYE, COLOR_MONSTER, COLOR_GROUND,
  COLOR_DEATH, PANEL_FLASH_COLOR,
  WORLD_COUNT, WORLD_PAPER, WORLD_PLAYER_FILL, WORLD_PLAYER_EYE,
  WORLD_SKY_TOP, WORLD_SKY_BOTTOM, WORLD_PLATFORM_FILL, WORLD_PLATFORM_TOP, HALFTONE_OPACITY, STAGES_PER_PANEL,
  AUDIO_ENABLED, AUDIO_MASTER_VOLUME,
  SFX_JUMP_VOLUME, SFX_JUMP_DURATION, SFX_JUMP_BASE_FREQ,
  SFX_SLASH_VOLUME, SFX_SLASH_DURATION, SFX_SLASH_BASE_FREQ,
  SFX_STOMP_VOLUME, SFX_STOMP_DURATION, SFX_STOMP_BASE_FREQ,
  SFX_HIT_VOLUME, SFX_HIT_DURATION, SFX_HIT_BASE_FREQ,
  SFX_VICTORY_VOLUME, SFX_VICTORY_DURATION, SFX_VICTORY_BASE_FREQ, SFX_VICTORY_STEPS,
  SFX_GAMEOVER_VOLUME, SFX_GAMEOVER_DURATION, SFX_GAMEOVER_BASE_FREQ,
} from './tuning.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// A reusable comic halftone dot pattern created once at startup.
const halftoneCanvas = document.createElement('canvas');
halftoneCanvas.width = 32;
halftoneCanvas.height = 32;
const hctx = halftoneCanvas.getContext('2d');
hctx.fillStyle = COLOR_INK;
for (let y = 4; y < 32; y += 8) {
  for (let x = 4; x < 32; x += 8) {
    hctx.beginPath();
    hctx.arc(x, y, 1.8, 0, Math.PI * 2);
    hctx.fill();
  }
}
const halftonePattern = ctx.createPattern(halftoneCanvas, 'repeat');

// A rough paper grain pattern.
const grainCanvas = document.createElement('canvas');
grainCanvas.width = 64;
grainCanvas.height = 64;
const gctx = grainCanvas.getContext('2d');
gctx.fillStyle = COLOR_INK;
for (let i = 0; i < 200; i++) {
  const x = Math.random() * 64;
  const y = Math.random() * 64;
  const r = Math.random() * 0.6 + 0.2;
  gctx.beginPath();
  gctx.arc(x, y, r, 0, Math.PI * 2);
  gctx.fill();
}
const grainPattern = ctx.createPattern(grainCanvas, 'repeat');

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
let paused = false;           // true while the run is paused (P or Escape)
let world = 0;                // current world theme, chosen per run
let currentPaper = COLOR_PAPER; // paper colour for the current world
let jumpQueued = false;       // a Space / ArrowUp / KeyW press waiting for update() to spend on a jump
let slashQueued = false;      // a '/' press waiting for update() to spend on a swing
let runTime = 0;              // seconds of active run, drives the temporary controls hint
let hasSlashed = false;       // true once the player has swung, which hides the controls hint

// Debug / performance overlays, enabled via ?fps and ?debug query parameters.
const urlParams = new URLSearchParams(location.search);
const SHOW_FPS = urlParams.has('fps');
const DEBUG_COLLIDERS = urlParams.has('debug');
let fps = 60;
let fpsAccumulator = 0;
let fpsFrameCount = 0;
let avgFps = 60;
let minFps = 60;

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
  paused = false;
  world = Math.floor(Math.random() * WORLD_COUNT);
  currentPaper = WORLD_PAPER[world];
  jumpQueued = false;
  slashQueued = false;
  runTime = 0;
  hasSlashed = false;
}
reset();

// ---------------------------------------------------------------------------
// Audio: every sound is synthesized on the fly, no audio files
// ---------------------------------------------------------------------------

// One shared context for the whole page. Browsers block audio until the player
// interacts, so this is created (and resumed) from the first keydown.
let audioCtx = null;
let masterGain = null;
let noiseBuffer = null;
let audioTried = false;

function initAudio() {
  if (!AUDIO_ENABLED || audioTried) {
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    return;
  }
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) {
    audioTried = true; // no Web Audio here: stop trying, the game still runs
    return;
  }
  audioCtx = new Ctor();
  masterGain = audioCtx.createGain();
  masterGain.gain.value = AUDIO_MASTER_VOLUME;
  masterGain.connect(audioCtx.destination);
  noiseBuffer = makeNoiseBuffer(0.5);
  audioTried = true;
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

// Half a second of white noise, reused as the source for every noisy sound.
function makeNoiseBuffer(seconds) {
  const length = Math.max(1, Math.floor(audioCtx.sampleRate * seconds));
  const buffer = audioCtx.createBuffer(1, length, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

// A filtered noise burst: the air of the swoosh, the grit of the stomp, the click of the hit.
function noiseBurst(volume, duration, filterType, freqStart, freqEnd, q) {
  const src = audioCtx.createBufferSource();
  src.buffer = noiseBuffer;
  const filter = audioCtx.createBiquadFilter();
  filter.type = filterType;
  filter.Q.value = q;
  const t = audioCtx.currentTime;
  filter.frequency.setValueAtTime(freqStart, t);
  filter.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), t + duration);
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);
  src.start(t);
  src.stop(t + duration + 0.02);
}

// One oscillator with a pitch sweep and a percussive attack/decay envelope.
function tone(volume, duration, type, freqStart, freqEnd, delay = 0) {
  const osc = audioCtx.createOscillator();
  osc.type = type;
  const t = audioCtx.currentTime + delay;
  osc.frequency.setValueAtTime(freqStart, t);
  if (freqEnd !== freqStart) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t + duration);
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), t + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(t);
  osc.stop(t + duration + 0.02);
}

// Guard: silent until the context exists and has been unlocked by a keypress.
function audioReady() {
  return AUDIO_ENABLED && audioCtx !== null && audioCtx.state !== 'closed';
}

// Springing off the page: a quick rising-falling "boing" tone.
function playJump() {
  if (!audioReady()) return;
  tone(SFX_JUMP_VOLUME, SFX_JUMP_DURATION, 'triangle',
    SFX_JUMP_BASE_FREQ * 1.6, SFX_JUMP_BASE_FREQ * 0.55);
  tone(SFX_JUMP_VOLUME * 0.4, SFX_JUMP_DURATION * 0.8, 'sine',
    SFX_JUMP_BASE_FREQ * 1.2, SFX_JUMP_BASE_FREQ * 0.5, 0.02);
}

// Swinging the sword: a fast airy swoosh, with a falling blade tone under it.
function playSlash() {
  if (!audioReady()) return;
  noiseBurst(SFX_SLASH_VOLUME, SFX_SLASH_DURATION, 'bandpass',
    SFX_SLASH_BASE_FREQ, SFX_SLASH_BASE_FREQ * 0.18, 1.1);
  tone(SFX_SLASH_VOLUME * 0.5, SFX_SLASH_DURATION, 'triangle',
    SFX_SLASH_BASE_FREQ * 0.6, SFX_SLASH_BASE_FREQ * 0.15);
}

// Landing on a monster's head: a low body thump with a short noise slap on top.
function playStomp() {
  if (!audioReady()) return;
  tone(SFX_STOMP_VOLUME, SFX_STOMP_DURATION, 'sine', SFX_STOMP_BASE_FREQ, SFX_STOMP_BASE_FREQ * 0.28);
  noiseBurst(SFX_STOMP_VOLUME * 0.5, SFX_STOMP_DURATION * 0.5, 'lowpass',
    SFX_STOMP_BASE_FREQ * 6, SFX_STOMP_BASE_FREQ * 2, 0.7);
}

// A slash connecting: a sharp ping, layered over the swoosh.
function playHit() {
  if (!audioReady()) return;
  tone(SFX_HIT_VOLUME, SFX_HIT_DURATION, 'square', SFX_HIT_BASE_FREQ, SFX_HIT_BASE_FREQ * 0.3);
  noiseBurst(SFX_HIT_VOLUME * 0.4, SFX_HIT_DURATION * 0.4, 'highpass',
    SFX_HIT_BASE_FREQ * 2, SFX_HIT_BASE_FREQ * 1.5, 0.8);
}

// Panel 8 cleared: a four-note rising jingle.
function playVictory() {
  if (!audioReady()) return;
  const note = SFX_VICTORY_DURATION / SFX_VICTORY_STEPS.length;
  SFX_VICTORY_STEPS.forEach((ratio, i) => {
    tone(SFX_VICTORY_VOLUME, note * 1.6, 'triangle',
      SFX_VICTORY_BASE_FREQ * ratio, SFX_VICTORY_BASE_FREQ * ratio, i * note);
  });
}

// The run ends: one long tone sliding down, so failure reads instantly.
function playGameOver() {
  if (!audioReady()) return;
  tone(SFX_GAMEOVER_VOLUME, SFX_GAMEOVER_DURATION, 'square',
    SFX_GAMEOVER_BASE_FREQ, SFX_GAMEOVER_BASE_FREQ * 0.35);
}

// ---------------------------------------------------------------------------
// Input: held keys for movement, single presses for jump and slash
// ---------------------------------------------------------------------------

const held = new Set();
const JUMP_KEYS = new Set(['Space', 'ArrowUp', 'KeyW']);
const BLOCKED = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'Slash', 'KeyW']);

addEventListener('keydown', (e) => {
  if (BLOCKED.has(e.code)) e.preventDefault();
  initAudio(); // first keypress is what lets the browser play sound
  held.add(e.code);
  if (e.repeat) return;
  // Space, Up arrow and W all jump while running, and retry once the run is over.
  if (JUMP_KEYS.has(e.code)) {
    if (gameOver || victory) reset();
    else jumpQueued = true;
  }
  if (e.code === 'Slash' || e.key === '/') slashQueued = true;
  if (e.code === 'KeyR') reset();
  if ((e.code === 'KeyP' || e.code === 'Escape') && !gameOver && !victory && panelClearTimer <= 0) {
    paused = !paused;
  }
});
addEventListener('keyup', (e) => held.delete(e.code));
addEventListener('blur', () => held.clear());

// Mobile: a tap anywhere on the canvas does the one action (jump). A two-finger tap slashes.
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  initAudio();
  if (gameOver || victory) {
    reset();
    return;
  }
  if (e.touches.length >= 2) {
    slashQueued = true;
  } else {
    jumpQueued = true;
  }
}, { passive: false });

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
    playVictory();
    return;
  }
  panel++;
  spawnedThisPanel = 0;
  spawnTimer = 0;
  monsters.length = 0;
}

function update(dt) {
  // The run has ended, is paused, or a panel is being celebrated: hold physics still.
  if (gameOver || victory || paused) return;

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
    playJump();
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
      playStomp();
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
      playGameOver();
      return;
    }
  }

  // --- slash ---
  if (slashQueued) {
    player.slashTimer = SLASH_DURATION;
    slashQueued = false;
    hasSlashed = true;
    playSlash();
  }
  if (player.slashTimer > 0) {
    player.slashTimer = Math.max(0, player.slashTimer - dt);
    let connected = false;
    for (const m of monsters) {
      if (!m.dead && slashHitsMonster(m)) {
        killMonster(m);
        connected = true;
      }
    }
    if (connected) playHit();
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

function getStage() {
  return STAGES_PER_PANEL[Math.max(0, Math.min(panel - 1, STAGES_PER_PANEL.length - 1))];
}

function drawSky(stage) {
  const left = PANEL_MARGIN;
  const right = PLAYFIELD_W - PANEL_MARGIN;
  const top = PANEL_MARGIN;
  const bottom = GROUND_Y;

  if (stage === 0) {
    // Graphite wash.
    ctx.fillStyle = '#B8B0A0';
    ctx.globalAlpha = 0.22;
    ctx.fillRect(left, top, right - left, bottom - top);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#8A8A8A';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(left, bottom);
    ctx.lineTo(right, bottom);
    ctx.stroke();
    return;
  }

  const grad = ctx.createLinearGradient(0, top, 0, bottom);
  grad.addColorStop(0, WORLD_SKY_TOP[world]);
  grad.addColorStop(1, WORLD_SKY_BOTTOM[world]);
  ctx.fillStyle = grad;
  ctx.fillRect(left, top, right - left, bottom - top);

  if (stage === 3) {
    // Neon horizon glow.
    ctx.fillStyle = '#FFF4D2';
    ctx.globalAlpha = 0.18;
    ctx.fillRect(left, bottom - 70, right - left, 70);
    ctx.globalAlpha = 1;
  }
}

function drawClouds(stage) {
  if (stage < 1) return;
  ctx.save();
  ctx.globalAlpha = stage === 1 ? 0.35 : 0.75;
  ctx.fillStyle = stage === 3 ? '#FFF4D2' : currentPaper;
  ctx.strokeStyle = COLOR_INK;
  ctx.lineWidth = OUTLINE_WIDTH * 0.75;
  const clouds = [
    { x: PANEL_MARGIN + 90, y: 95, s: 1 },
    { x: PLAYFIELD_W - PANEL_MARGIN - 130, y: 80, s: 0.85 },
    { x: PLAYFIELD_W / 2 + 60, y: 115, s: 0.65 },
  ];
  for (const c of clouds) {
    ctx.beginPath();
    ctx.arc(c.x - 22 * c.s, c.y, 16 * c.s, Math.PI, 0);
    ctx.arc(c.x + 4 * c.s, c.y - 12 * c.s, 22 * c.s, Math.PI, 0);
    ctx.arc(c.x + 32 * c.s, c.y, 18 * c.s, Math.PI, 0);
    ctx.lineTo(c.x + 32 * c.s, c.y + 10 * c.s);
    ctx.lineTo(c.x - 22 * c.s, c.y + 10 * c.s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function drawHills(stage) {
  const left = PANEL_MARGIN;
  const right = PLAYFIELD_W - PANEL_MARGIN;
  const bottom = GROUND_Y - 35;

  ctx.save();
  if (stage === 0) {
    ctx.strokeStyle = '#8A8A8A';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.45;
  } else {
    ctx.globalAlpha = 0.55;
    const fills = ['#D9B2A6', '#8FBC5A', '#2E3A5C'];
    ctx.fillStyle = fills[world];
  }

  // Two slow rolling hill layers.
  const hills = [
    { y: bottom, amp: 28, freq: 0.006, shift: 0 },
    { y: bottom - 12, amp: 20, freq: 0.009, shift: 120 },
  ];
  for (const hill of hills) {
    ctx.beginPath();
    ctx.moveTo(left, hill.y);
    for (let x = left; x <= right; x += 20) {
      const y = hill.y - Math.sin((x + hill.shift) * hill.freq) * hill.amp;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(right, PLAYFIELD_H);
    ctx.lineTo(left, PLAYFIELD_H);
    ctx.closePath();
    if (stage === 0) ctx.stroke(); else ctx.fill();
    if (stage > 0) ctx.stroke();
  }
  ctx.restore();
}

function drawCelestialBody(stage) {
  if (stage === 0) return;
  ctx.save();
  const cx = world === 2 ? PLAYFIELD_W - PANEL_MARGIN - 90 : PANEL_MARGIN + 70;
  const cy = 95;
  ctx.globalAlpha = stage === 1 ? 0.45 : 0.85;
  if (world === 2) {
    // Big cream crescent moon.
    ctx.fillStyle = '#FFF4D2';
    ctx.strokeStyle = COLOR_INK;
    ctx.lineWidth = OUTLINE_WIDTH * 0.75;
    ctx.beginPath();
    ctx.arc(cx, cy, 36, -Math.PI * 0.55, Math.PI * 0.55);
    ctx.arc(cx + 16, cy, 28, Math.PI * 0.5, -Math.PI * 0.5, true);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    // Sun circle with radiating rays.
    ctx.fillStyle = world === 0 ? '#F7B32B' : '#F7B32B';
    ctx.strokeStyle = COLOR_INK;
    ctx.lineWidth = OUTLINE_WIDTH * 0.75;
    ctx.beginPath();
    ctx.arc(cx, cy, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (stage >= 2) {
      ctx.strokeStyle = world === 0 ? '#C4342A' : '#C86D51';
      ctx.lineWidth = 3;
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * 40, cy + Math.sin(a) * 40);
        ctx.lineTo(cx + Math.cos(a) * 52, cy + Math.sin(a) * 52);
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}

function drawPowerLines(stage) {
  if (stage < 1) return;
  ctx.save();
  ctx.strokeStyle = COLOR_INK;
  ctx.lineWidth = 1.2;
  ctx.globalAlpha = stage === 1 ? 0.35 : 0.6;
  const left = PANEL_MARGIN + 40;
  const right = PLAYFIELD_W - PANEL_MARGIN - 40;
  const y = 140;
  const poles = [left + 30, left + 180, right - 220, right - 60];
  for (const px of poles) {
    ctx.beginPath();
    ctx.moveTo(px, y);
    ctx.lineTo(px, GROUND_Y - 80);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(px - 14, y);
    ctx.lineTo(px + 14, y);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(poles[0] - 14, y + 4);
  for (const px of poles) ctx.lineTo(px, y + 4 + Math.sin(px * 0.05) * 3);
  ctx.lineTo(poles[poles.length - 1] + 14, y + 4);
  ctx.stroke();
  ctx.restore();
}

function drawWorldExtras(stage) {
  if (stage < 1) return;
  ctx.save();
  ctx.globalAlpha = stage === 1 ? 0.4 : 0.9;
  ctx.strokeStyle = COLOR_INK;
  ctx.lineWidth = OUTLINE_WIDTH * 0.6;

  if (world === 0) {
    // Hanging print-shop sign.
    ctx.fillStyle = '#F2E5C4';
    const sx = PLAYFIELD_W - PANEL_MARGIN - 110;
    const sy = 195;
    ctx.fillRect(sx, sy, 78, 38);
    ctx.strokeRect(sx, sy, 78, 38);
    ctx.fillStyle = COLOR_INK;
    ctx.font = `bold 18px ${FONT_STACK}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('INK', sx + 39, sy + 21);
    // Scissors icon beside it.
    ctx.strokeStyle = '#7A7A7A';
    ctx.beginPath();
    ctx.arc(sx + 100, sy + 12, 7, 0, Math.PI * 2);
    ctx.arc(sx + 100, sy + 28, 7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(sx + 96, sy + 8);
    ctx.lineTo(sx + 118, sy + 32);
    ctx.stroke();
  } else if (world === 1) {
    // Flowers along the ground base.
    ctx.fillStyle = '#E9B949';
    const flowers = [
      { x: PANEL_MARGIN + 55, h: 22 },
      { x: PANEL_MARGIN + 120, h: 30 },
      { x: PLAYFIELD_W - PANEL_MARGIN - 85, h: 25 },
    ];
    for (const f of flowers) {
      ctx.beginPath();
      ctx.arc(f.x, GROUND_Y - 6, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(f.x, GROUND_Y - 6);
      ctx.quadraticCurveTo(f.x - 4, GROUND_Y - f.h / 2, f.x, GROUND_Y - f.h);
      ctx.stroke();
    }
    // Small bird silhouette.
    ctx.strokeStyle = COLOR_INK;
    ctx.beginPath();
    ctx.moveTo(PANEL_MARGIN + 190, 120);
    ctx.quadraticCurveTo(PANEL_MARGIN + 198, 110, PANEL_MARGIN + 206, 120);
    ctx.stroke();
  } else {
    // Stars and neon "OPEN" sign.
    ctx.fillStyle = '#FFF4D2';
    const stars = [
      { x: PANEL_MARGIN + 35, y: 75 },
      { x: PANEL_MARGIN + 160, y: 55 },
      { x: PLAYFIELD_W / 2, y: 65 },
    ];
    for (const s of stars) {
      ctx.beginPath();
      ctx.moveTo(s.x, s.y - 5);
      ctx.lineTo(s.x + 1.5, s.y - 1.5);
      ctx.lineTo(s.x + 5, s.y);
      ctx.lineTo(s.x + 1.5, s.y + 1.5);
      ctx.lineTo(s.x, s.y + 5);
      ctx.lineTo(s.x - 1.5, s.y + 1.5);
      ctx.lineTo(s.x - 5, s.y);
      ctx.lineTo(s.x - 1.5, s.y - 1.5);
      ctx.closePath();
      ctx.fill();
    }
    if (stage === 3) {
      ctx.fillStyle = '#F7B32B';
      const nx = PLAYFIELD_W - PANEL_MARGIN - 120;
      const ny = 185;
      ctx.fillRect(nx, ny, 92, 34);
      ctx.strokeRect(nx, ny, 92, 34);
      ctx.fillStyle = COLOR_INK;
      ctx.font = `bold 16px ${FONT_STACK}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('OPEN', nx + 46, ny + 19);
    }
  }
  ctx.restore();
}

function drawCityscape(stage) {
  const left = PANEL_MARGIN;
  const right = PLAYFIELD_W - PANEL_MARGIN;
  const bottom = GROUND_Y;

  ctx.save();
  if (stage === 0) {
    // Pencil sketch: outlines and cross-hatching only.
    ctx.strokeStyle = '#8A8A8A';
    ctx.lineWidth = 1.2;
    ctx.globalAlpha = 0.65;
  } else {
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = stage === 3 ? WORLD_PLATFORM_FILL[world] : COLOR_INK;
  }

  // Buildings.
  const buildings = [
    { x: left + 30, w: 55, h: 100, windows: 3 },
    { x: left + 100, w: 40, h: 140, windows: 4 },
    { x: left + 155, w: 65, h: 80, windows: 3 },
    { x: right - 230, w: 50, h: 120, windows: 4 },
    { x: right - 165, w: 70, h: 95, windows: 3 },
    { x: right - 85, w: 45, h: 155, windows: 5 },
  ];
  for (const b of buildings) {
    if (stage === 0) {
      ctx.strokeRect(b.x, bottom - b.h, b.w, b.h);
      // Cross-hatch.
      ctx.beginPath();
      for (let i = 0; i < b.h; i += 14) {
        ctx.moveTo(b.x, bottom - b.h + i);
        ctx.lineTo(b.x + b.w, bottom - b.h + i + 10);
      }
      ctx.stroke();
    } else {
      ctx.fillRect(b.x, bottom - b.h, b.w, b.h);
      ctx.strokeRect(b.x, bottom - b.h, b.w, b.h);
      // Windows.
      if (stage >= 2) {
        ctx.fillStyle = stage === 3 ? '#FFF4D2' : currentPaper;
        const cols = 2;
        const rows = b.windows;
        const winW = b.w * 0.28;
        const winH = (b.h * 0.65) / rows;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const wx = b.x + b.w * 0.18 + c * (winW + b.w * 0.12);
            const wy = bottom - b.h + b.h * 0.15 + r * (winH + b.h * 0.05);
            ctx.fillRect(wx, wy, winW, winH * 0.7);
          }
        }
        ctx.fillStyle = stage === 3 ? WORLD_PLATFORM_FILL[world] : COLOR_INK;
      }
    }
  }

  // Bridge with arches and cables.
  ctx.beginPath();
  const archW = 120;
  const archCount = 4;
  const startX = left + (right - left - archCount * archW) / 2;
  for (let i = 0; i < archCount; i++) {
    const ax = startX + i * archW + archW / 2;
    ctx.moveTo(ax - archW * 0.38, bottom);
    ctx.arc(ax, bottom, archW * 0.38, Math.PI, 0);
    ctx.lineTo(ax + archW * 0.38, bottom - 22);
    ctx.lineTo(ax - archW * 0.38, bottom - 22);
    ctx.closePath();
    // Cables.
    if (stage > 0) {
      ctx.moveTo(ax - archW * 0.38, bottom - 22);
      ctx.quadraticCurveTo(ax, bottom - 55, ax + archW * 0.38, bottom - 22);
    }
  }
  if (stage === 0) ctx.stroke(); else ctx.fill();
  if (stage > 0) ctx.stroke();
  ctx.restore();
}

function drawGroundPlatform(stage) {
  const left = PANEL_MARGIN;
  const right = PLAYFIELD_W - PANEL_MARGIN;
  const top = GROUND_Y;
  const bottom = GROUND_Y + 72;

  if (stage === 0) {
    // Sketch: outline + hatch, no fill.
    ctx.strokeStyle = '#8A8A8A';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(left, top, right - left, bottom - top);
    ctx.beginPath();
    for (let i = 0; i < right - left; i += 18) {
      ctx.moveTo(left + i, top);
      ctx.lineTo(left + i + 25, bottom);
    }
    ctx.stroke();
    return;
  }

  ctx.fillStyle = WORLD_PLATFORM_FILL[world];
  ctx.fillRect(left, top, right - left, bottom - top);

  // Mustard top trim.
  ctx.fillStyle = WORLD_PLATFORM_TOP[world];
  ctx.fillRect(left, top, right - left, 10);

  // Arch cutouts along the bottom edge.
  ctx.fillStyle = currentPaper;
  const archCount = 7;
  const archW = (right - left) / archCount;
  for (let i = 0; i < archCount; i++) {
    const cx = left + archW * (i + 0.5);
    ctx.beginPath();
    ctx.arc(cx, bottom, archW * 0.32, Math.PI, 0);
    ctx.lineTo(cx + archW * 0.32, bottom);
    ctx.closePath();
    ctx.fill();
  }

  // Brick courses.
  if (stage >= 2) {
    ctx.strokeStyle = stage === 3 ? '#FFF4D2' : COLOR_INK;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.25;
    for (let y = top + 18; y < bottom; y += 14) {
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(right, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // Ink outline.
  ctx.lineWidth = OUTLINE_WIDTH;
  ctx.strokeStyle = COLOR_INK;
  ctx.strokeRect(left, top, right - left, bottom - top);
}

function drawSketchOverlay(stage) {
  if (stage >= 2) return;
  ctx.save();
  ctx.strokeStyle = '#8A8A8A';
  ctx.lineWidth = 1;
  ctx.globalAlpha = stage === 0 ? 0.22 : 0.1;
  for (let i = -100; i < PLAYFIELD_W + 100; i += 28) {
    ctx.beginPath();
    ctx.moveTo(i, PANEL_MARGIN);
    ctx.lineTo(i + 90, GROUND_Y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawHalftone() {
  ctx.save();
  ctx.fillStyle = halftonePattern;
  ctx.globalAlpha = HALFTONE_OPACITY;
  ctx.fillRect(PANEL_MARGIN, PANEL_MARGIN, PLAYFIELD_W - PANEL_MARGIN * 2, PLAYFIELD_H - PANEL_MARGIN * 2);
  ctx.restore();
}

function drawPaperGrain() {
  ctx.save();
  ctx.fillStyle = grainPattern;
  ctx.globalAlpha = 0.08;
  ctx.fillRect(PANEL_MARGIN, PANEL_MARGIN, PLAYFIELD_W - PANEL_MARGIN * 2, PLAYFIELD_H - PANEL_MARGIN * 2);
  ctx.restore();
}

function drawPanel() {
  const stage = getStage();

  ctx.fillStyle = currentPaper;
  ctx.fillRect(0, 0, PLAYFIELD_W, PLAYFIELD_H);

  drawSky(stage);
  drawHills(stage);
  drawClouds(stage);
  drawCelestialBody(stage);
  drawCityscape(stage);
  drawPowerLines(stage);
  drawWorldExtras(stage);
  drawGroundPlatform(stage);

  // Minimal inking flash while a panel clear is being celebrated.
  if (panelClearTimer > 0) {
    const flash = panelClearTimer / PANEL_CLEAR_DELAY;
    ctx.fillStyle = PANEL_FLASH_COLOR;
    ctx.globalAlpha = 0.15 + flash * 0.25;
    ctx.fillRect(PANEL_MARGIN, PANEL_MARGIN, PLAYFIELD_W - PANEL_MARGIN * 2, PLAYFIELD_H - PANEL_MARGIN * 2);
    ctx.globalAlpha = 1;
  }

  drawSketchOverlay(stage);
  drawHalftone();
  drawPaperGrain();

  ctx.lineWidth = OUTLINE_WIDTH;
  ctx.strokeStyle = COLOR_INK;
  ctx.strokeRect(PANEL_MARGIN, PANEL_MARGIN, PLAYFIELD_W - PANEL_MARGIN * 2, PLAYFIELD_H - PANEL_MARGIN * 2);
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

function drawMitten(x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function drawPlayerShape(w, h) {
  if (world === 0) {
    // Triangle Guy: a rounded red triangle with a flowing cape behind him.
    const cy = -h / 2;
    // Cape.
    ctx.beginPath();
    ctx.moveTo(-w * 0.35, -h * 0.88);
    ctx.quadraticCurveTo(-w * 1.05, -h * 0.55, -w * 0.75, -h * 0.12);
    ctx.quadraticCurveTo(-w * 0.55, -h * 0.22, -w * 0.45, 0);
    ctx.lineTo(-w * 0.35, -h * 0.15);
    ctx.closePath();
    ctx.fillStyle = gameOver ? COLOR_DEATH : WORLD_PLAYER_FILL[world];
    ctx.fill();
    ctx.stroke();
    // Body.
    roundedPath([
      { x: -w / 2, y: -h },
      { x: w / 2, y: -h / 2 },
      { x: -w / 2, y: 0 },
    ], Math.min(w, h) * 0.32);
  } else if (world === 1) {
    // Ink Blot: a black teardrop with a small trailing droplet.
    const cy = -h / 2;
    ctx.beginPath();
    ctx.moveTo(w * 0.48, cy);
    ctx.bezierCurveTo(w * 0.48, cy - h * 0.55, -w * 0.42, cy - h * 0.55, -w * 0.42, cy);
    ctx.bezierCurveTo(-w * 0.42, cy + h * 0.35, w * 0.12, cy + h * 0.5, w * 0.48, cy);
    ctx.closePath();
    // Trailing droplet.
    ctx.moveTo(-w * 0.62, -h * 0.45);
    ctx.arc(-w * 0.62, -h * 0.45, w * 0.12, 0, Math.PI * 2);
  } else {
    // Crescent Moon: a cream crescent opening forward.
    const cy = -h / 2;
    const r = h * 0.58;
    const outerX = -w * 0.1;
    const innerX = outerX + w * 0.32;
    ctx.beginPath();
    ctx.arc(outerX, cy, r, -Math.PI * 0.5, Math.PI * 0.5);
    ctx.arc(innerX, cy, r * 0.78, Math.PI * 0.45, -Math.PI * 0.45, true);
    ctx.closePath();
  }
}

function drawPlayerFace(w, h) {
  ctx.fillStyle = WORLD_PLAYER_EYE[world];
  ctx.strokeStyle = COLOR_INK;
  ctx.lineWidth = OUTLINE_WIDTH * 0.75;
  if (world === 0) {
    // Triangle Guy: one big oval eye and a determined eyebrow.
    ctx.beginPath();
    ctx.ellipse(w * 0.02, -h * 0.55, w * 0.14, h * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Eyebrow.
    ctx.beginPath();
    ctx.moveTo(-w * 0.1, -h * 0.78);
    ctx.quadraticCurveTo(w * 0.05, -h * 0.85, w * 0.18, -h * 0.75);
    ctx.stroke();
  } else if (world === 1) {
    // Ink Blot: two cream eye holes and a worried brow.
    ctx.beginPath();
    ctx.ellipse(-w * 0.06, -h * 0.62, w * 0.1, h * 0.13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(w * 0.14, -h * 0.58, w * 0.09, h * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Worried lines.
    ctx.beginPath();
    ctx.moveTo(-w * 0.18, -h * 0.78);
    ctx.quadraticCurveTo(0, -h * 0.88, w * 0.22, -h * 0.76);
    ctx.stroke();
  } else {
    // Crescent: one yellow eye inside the moon bowl.
    ctx.beginPath();
    ctx.arc(-w * 0.02, -h * 0.5, w * 0.13, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

function drawPlayerHands(w, h) {
  ctx.fillStyle = gameOver ? COLOR_DEATH : WORLD_PLAYER_FILL[world];
  ctx.strokeStyle = COLOR_INK;
  ctx.lineWidth = OUTLINE_WIDTH * 0.75;
  if (world === 0) {
    // Triangle Guy: mittens at front and back.
    drawMitten(w * 0.42, -h * 0.35, w * 0.11);
    drawMitten(-w * 0.25, -h * 0.18, w * 0.1);
  } else if (world === 1) {
    // Ink Blot: tiny mittens.
    drawMitten(w * 0.25, -h * 0.25, w * 0.09);
    drawMitten(-w * 0.32, -h * 0.22, w * 0.08);
  } else {
    // Crescent: small mittens at the tips.
    drawMitten(w * 0.32, -h * 0.22, w * 0.09);
    drawMitten(w * 0.22, -h * 0.78, w * 0.09);
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

  drawPlayerShape(w, h);
  ctx.fillStyle = gameOver ? COLOR_DEATH : WORLD_PLAYER_FILL[world];
  ctx.fill();
  ctx.stroke();

  drawPlayerHands(w, h);
  drawPlayerFace(w, h);
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
  ctx.lineWidth = TEXT_OUTLINE_WIDTH;
  ctx.strokeStyle = COLOR_INK;
  const text = `SCORE ${score}`;
  const x = PANEL_MARGIN + 12;
  const y = PANEL_MARGIN + 8;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = currentPaper;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function drawPanelCounter() {
  ctx.save();
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.font = `${PANEL_COUNTER_FONT_SIZE}px ${FONT_STACK}`;
  ctx.lineWidth = TEXT_OUTLINE_WIDTH;
  ctx.strokeStyle = COLOR_INK;
  const text = `PANEL ${panel} OF 8`;
  const x = PLAYFIELD_W - PANEL_MARGIN - 12;
  const y = PANEL_MARGIN + 10;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = currentPaper;
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
  ctx.lineWidth = TEXT_OUTLINE_WIDTH;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = COLOR_INK;
  const x = PANEL_MARGIN + CONTROLS_HINT_MARGIN;
  const y = PLAYFIELD_H - PANEL_MARGIN - CONTROLS_HINT_MARGIN;
  ctx.strokeText(CONTROLS_HINT, x, y);
  ctx.fillStyle = currentPaper;
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
  ctx.lineWidth = TEXT_OUTLINE_WIDTH;
  const text = `PANEL ${panel} CLEARED!`;
  ctx.strokeText(text, cx, cy);
  ctx.fillStyle = currentPaper;
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
  ctx.lineWidth = TEXT_OUTLINE_WIDTH;
  ctx.strokeText(GAME_OVER_TEXT, cx, GAME_OVER_BANNER_Y);
  ctx.fillStyle = currentPaper;
  ctx.fillText(GAME_OVER_TEXT, cx, GAME_OVER_BANNER_Y);

  ctx.font = `${GAME_OVER_HINT_SIZE}px ${FONT_STACK}`;
  ctx.lineWidth = TEXT_OUTLINE_WIDTH;
  const hintY1 = GAME_OVER_BANNER_Y + GAME_OVER_HINT_GAP;
  ctx.strokeText(RESTART_HINT_LINE1, cx, hintY1);
  ctx.fillStyle = currentPaper;
  ctx.fillText(RESTART_HINT_LINE1, cx, hintY1);
  const hintY2 = hintY1 + GAME_OVER_HINT_SIZE + 8;
  ctx.strokeText(RESTART_HINT_LINE2, cx, hintY2);
  ctx.fillText(RESTART_HINT_LINE2, cx, hintY2);
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
  ctx.lineWidth = TEXT_OUTLINE_WIDTH;
  ctx.strokeText(VICTORY_TEXT, cx, GAME_OVER_BANNER_Y);
  ctx.fillStyle = currentPaper;
  ctx.fillText(VICTORY_TEXT, cx, GAME_OVER_BANNER_Y);

  ctx.font = `${GAME_OVER_HINT_SIZE}px ${FONT_STACK}`;
  ctx.lineWidth = TEXT_OUTLINE_WIDTH;
  const scoreY = GAME_OVER_BANNER_Y + GAME_OVER_HINT_GAP;
  const scoreText = `FINAL SCORE ${score}`;
  ctx.strokeText(scoreText, cx, scoreY);
  ctx.fillStyle = currentPaper;
  ctx.fillText(scoreText, cx, scoreY);

  const hintY1 = scoreY + GAME_OVER_HINT_GAP;
  ctx.strokeText(VICTORY_HINT_LINE1, cx, hintY1);
  ctx.fillStyle = currentPaper;
  ctx.fillText(VICTORY_HINT_LINE1, cx, hintY1);
  const hintY2 = hintY1 + GAME_OVER_HINT_SIZE + 8;
  ctx.strokeText(VICTORY_HINT_LINE2, cx, hintY2);
  ctx.fillText(VICTORY_HINT_LINE2, cx, hintY2);
  ctx.restore();
}

function drawPaused() {
  if (!paused) return;
  const cx = PLAYFIELD_W / 2;
  const cy = PLAYFIELD_H / 2;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = COLOR_INK;

  ctx.font = `${PAUSED_FONT_SIZE}px ${FONT_STACK}`;
  ctx.lineWidth = TEXT_OUTLINE_WIDTH;
  ctx.strokeText(PAUSED_TEXT, cx, cy);
  ctx.fillStyle = currentPaper;
  ctx.fillText(PAUSED_TEXT, cx, cy);

  ctx.font = `${GAME_OVER_HINT_SIZE}px ${FONT_STACK}`;
  const hintY = cy + PAUSED_FONT_SIZE * 0.7;
  ctx.strokeText(PAUSED_HINT, cx, hintY);
  ctx.fillText(PAUSED_HINT, cx, hintY);
  ctx.restore();
}

function draw() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = currentPaper;
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
  drawPaused();
  if (DEBUG_COLLIDERS) drawDebugColliders();
  if (SHOW_FPS) drawFPS();
}

function drawDebugColliders() {
  ctx.save();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#00FF00';
  ctx.strokeRect(player.x - PLAYER_W / 2, player.y - PLAYER_H, PLAYER_W, PLAYER_H);
  ctx.strokeStyle = '#FF0000';
  for (const m of monsters) {
    if (m.dead && m.hitTimer <= 0) continue;
    ctx.strokeRect(m.x - m.w / 2, m.y - m.h, m.w, m.h);
  }
  ctx.restore();
}

function drawFPS() {
  ctx.save();
  ctx.font = '14px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.lineWidth = 1;
  ctx.strokeStyle = COLOR_INK;
  const text = `FPS ${Math.round(fps)} AVG ${Math.round(avgFps)} MIN ${Math.round(minFps)}`;
  ctx.strokeText(text, PANEL_MARGIN + 8, PANEL_MARGIN + 42);
  ctx.fillStyle = '#F2E5C4';
  ctx.fillText(text, PANEL_MARGIN + 8, PANEL_MARGIN + 42);
  ctx.restore();
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

  if (SHOW_FPS) {
    fps = 1 / Math.max(dt, 0.0001);
    fpsAccumulator += fps;
    fpsFrameCount++;
    if (fpsFrameCount >= 30) {
      avgFps = fpsAccumulator / fpsFrameCount;
      minFps = Math.min(minFps, avgFps);
      fpsAccumulator = 0;
      fpsFrameCount = 0;
    }
  }

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
