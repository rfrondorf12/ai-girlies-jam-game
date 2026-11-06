// M1 gray box: one comic panel, a wedge hero that runs, jumps and slashes a plain test target.
import {
  PLAYFIELD_W, PLAYFIELD_H, PANEL_MARGIN, GROUND_Y, GROUND_THICKNESS, OUTLINE_WIDTH, MAX_DT,
  GRAVITY, MAX_FALL_SPEED, JUMP_VELOCITY, MOVE_SPEED, PLAYER_W, PLAYER_H, PLAYER_START_X,
  SHAPE_ROUND, EYE_OFFSET_X, EYE_OFFSET_Y, EYE_RADIUS_X, EYE_RADIUS_Y,
  SLASH_DURATION, SLASH_REACH, SLASH_THICKNESS, SLASH_ARC_SPREAD, SLASH_SAMPLES, SHOULDER_HEIGHT,
  TARGET_W, TARGET_H, TARGET_X, HIT_FLASH, STOMP_SQUASH,
  COLOR_PAPER, COLOR_INK, COLOR_PLAYER, COLOR_EYE, COLOR_TARGET, COLOR_TARGET_HIT, COLOR_GROUND,
} from './tuning.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

// player.y is the bottom of the hero (its feet), not its top.
const player = { x: 0, y: 0, vx: 0, vy: 0, facing: 1, grounded: false, slashTimer: 0 };
const target = { hitTimer: 0, stompTimer: 0 };

function reset() {
  player.x = PLAYER_START_X;
  player.y = GROUND_Y;
  player.vx = 0;
  player.vy = 0;
  player.facing = 1;
  player.grounded = true;
  player.slashTimer = 0;
  target.hitTimer = 0;
  target.stompTimer = 0;
}
reset();

const targetLeft = () => TARGET_X - TARGET_W / 2;
const targetTop = () => GROUND_Y - TARGET_H;

// ---------------------------------------------------------------------------
// Input: held keys for movement, single presses for jump and slash
// ---------------------------------------------------------------------------

const held = new Set();
let jumpQueued = false;
let slashQueued = false;
const BLOCKED = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'Slash']);

addEventListener('keydown', (e) => {
  if (BLOCKED.has(e.code)) e.preventDefault();
  held.add(e.code);
  if (e.repeat) return;
  if (e.code === 'Space') jumpQueued = true;
  if (e.code === 'Slash' || e.key === '/') slashQueued = true;
  if (e.code === 'KeyR') reset();
});
addEventListener('keyup', (e) => held.delete(e.code));
addEventListener('blur', () => held.clear());

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

// The slash arc is sampled into points; if any sample lands inside the target box
// expanded by half the arc's thickness, the swing connected.
function slashHitsTarget() {
  const shoulderX = player.x;
  const shoulderY = player.y - PLAYER_H * SHOULDER_HEIGHT;
  const pad = SLASH_THICKNESS / 2;
  const left = targetLeft() - pad;
  const right = targetLeft() + TARGET_W + pad;
  const top = targetTop() - pad;
  const bottom = GROUND_Y + pad;
  const half = SLASH_ARC_SPREAD / 2;

  for (let i = 0; i < SLASH_SAMPLES; i++) {
    const angle = -half + SLASH_ARC_SPREAD * (i / (SLASH_SAMPLES - 1));
    const px = shoulderX + Math.cos(angle) * SLASH_REACH * player.facing;
    const py = shoulderY + Math.sin(angle) * SLASH_REACH;
    if (px >= left && px <= right && py >= top && py <= bottom) return true;
  }
  return false;
}

function update(dt) {
  // --- run ---
  let dir = 0;
  if (held.has('ArrowLeft') || held.has('KeyA')) dir -= 1;
  if (held.has('ArrowRight') || held.has('KeyD')) dir += 1;
  player.vx = dir * MOVE_SPEED;
  if (dir !== 0) player.facing = dir;
  player.x += player.vx * dt;

  const halfW = PLAYER_W / 2;
  player.x = Math.min(PLAYFIELD_W - halfW, Math.max(halfW, player.x));

  // --- jump ---
  if (jumpQueued && player.grounded) {
    player.vy = JUMP_VELOCITY;
    player.grounded = false;
  }
  jumpQueued = false;

  // --- gravity ---
  const prevBottom = player.y;
  player.vy = Math.min(player.vy + GRAVITY * dt, MAX_FALL_SPEED);
  player.y += player.vy * dt;
  player.grounded = false;

  // Land on the target's top edge when falling onto it: that is the stomp.
  const overTarget = player.x + halfW > targetLeft() && player.x - halfW < targetLeft() + TARGET_W;
  if (overTarget && player.vy > 0 && prevBottom <= targetTop() && player.y >= targetTop()) {
    player.y = targetTop();
    player.vy = 0;
    player.grounded = true;
    target.stompTimer = HIT_FLASH;
  }

  if (player.y >= GROUND_Y) {
    player.y = GROUND_Y;
    player.vy = 0;
    player.grounded = true;
  }

  // --- slash ---
  if (slashQueued) {
    player.slashTimer = SLASH_DURATION;
    slashQueued = false;
  }
  if (player.slashTimer > 0) {
    player.slashTimer = Math.max(0, player.slashTimer - dt);
    if (slashHitsTarget()) target.hitTimer = HIT_FLASH;
  }

  target.hitTimer = Math.max(0, target.hitTimer - dt);
  target.stompTimer = Math.max(0, target.stompTimer - dt);
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
  ctx.lineWidth = OUTLINE_WIDTH;
  ctx.strokeStyle = COLOR_INK;
  ctx.strokeRect(PANEL_MARGIN, PANEL_MARGIN, PLAYFIELD_W - PANEL_MARGIN * 2, PLAYFIELD_H - PANEL_MARGIN * 2);

  ctx.fillStyle = COLOR_GROUND;
  ctx.fillRect(PANEL_MARGIN, GROUND_Y, PLAYFIELD_W - PANEL_MARGIN * 2, GROUND_THICKNESS);
}

function drawTarget() {
  const squash = target.stompTimer > 0 ? STOMP_SQUASH * (target.stompTimer / HIT_FLASH) : 0;
  const h = TARGET_H * (1 - squash);
  const x = targetLeft();
  const y = GROUND_Y - h;
  ctx.fillStyle = target.hitTimer > 0 || target.stompTimer > 0 ? COLOR_TARGET_HIT : COLOR_TARGET;
  ctx.fillRect(x, y, TARGET_W, h);
  ctx.lineWidth = OUTLINE_WIDTH;
  ctx.strokeStyle = COLOR_INK;
  ctx.strokeRect(x, y, TARGET_W, h);
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
  ctx.fillStyle = COLOR_PLAYER;
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

function draw() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = COLOR_PAPER;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);

  drawPanel();
  drawTarget();
  drawPlayer();
  drawSlash();
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
