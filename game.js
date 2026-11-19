'use strict';

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const PALETTES = {
  dark: [
    null,
    '#4dd0e1', // I - cyan
    '#ffd54f', // O - yellow
    '#ba68c8', // T - purple
    '#81c784', // S - green
    '#e57373', // Z - red
    '#90caf9', // J - pale blue
    '#ffb74d', // L - orange
    '#ffffff', // power-up
    '#f06292', // + pink
    '#26a69a', // U teal
    '#d4e157', // Y lime
    '#ffca28', // single gold
    '#90a4ae', // hollow slate
    '#6b6b7b', // fixed / garbage
  ],
  light: [
    null,
    '#00acc1', // I - cyan
    '#f9a825', // O - yellow
    '#8e24aa', // T - purple
    '#43a047', // S - green
    '#e53935', // Z - red
    '#1e88e5', // J - blue
    '#fb8c00', // L - orange
    '#424242', // power-up
    '#d81b60', // + pink
    '#00897b', // U teal
    '#9e9d24', // Y lime
    '#ff8f00', // single gold
    '#546e7a', // hollow slate
    '#8a8a99', // fixed / garbage
  ],
};
const FIXED = 14;
let COLORS = PALETTES.dark;

const PIECES = [
  null,
  [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I
  [[2,2],[2,2]],                               // O
  [[0,3,0],[3,3,3],[0,0,0]],                  // T
  [[0,4,4],[4,4,0],[0,0,0]],                  // S
  [[5,5,0],[0,5,5],[0,0,0]],                  // Z
  [[6,0,0],[6,6,6],[0,0,0]],                  // J
  [[0,0,7],[7,7,7],[0,0,0]],                  // L
  null,                                        // 8 = power-up
  [[0,9,0],[9,9,9],[0,9,0]],                  // + (pentominó)
  [[10,0,10],[10,10,10],[0,0,0]],             // U (pentominó)
  [[0,0,0,0],[11,11,11,11],[0,11,0,0],[0,0,0,0]], // Y (pentominó)
  [[12]],                                      // 1x1 (recompensa por Tetris)
  [[13,13,13],[13,0,13],[13,13,13]],          // 3x3 hueca (reto)
];

const LINE_SCORES = [0, 100, 300, 500, 800];

const TSPIN_SCORES = [400, 800, 1200, 1600];
const B2B_MULT = 1.5;
const PERFECT_BONUS = 3000;
const POPUP_MS = 1200;

const POWERUP_EVERY = 5;
const PENTO_CHANCE = 0.10;
const HOLLOW_CHANCE = 0.05;
const FREEZE_MS = 5000;
const ENERGY_MAX = 100;
const ENERGY_PER_LINE = 10;
const PREVIEW_MS = 20000;
const SLOW_MS = 10000;
const QUEUE_LEN = 5;
const POWER_ICONS = { bomb: '💣', ray: '⚡', tint: '🎨', gravity: '⬇', freeze: '❄' };

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayScore = document.getElementById('overlay-score');
const restartBtn = document.getElementById('restart-btn');
const themeBtn = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');
const themeText = document.getElementById('theme-text');
const comboEl = document.getElementById('combo');
const modeSelect = document.getElementById('mode-select');
const goalEl = document.getElementById('goal');
const energyBar = document.getElementById('energy-bar');
const energyFill = document.getElementById('energy-fill');
const abilityMenu = document.getElementById('ability-menu');
const holdCanvas = document.getElementById('hold-canvas');
const holdCtx = holdCanvas.getContext('2d');
const queueCanvas = document.getElementById('queue-canvas');
const queueCtx = queueCanvas.getContext('2d');
const holdSection = document.getElementById('hold-section');
const queueSection = document.getElementById('queue-section');

const CHALLENGE_MS = 120000;
const CHALLENGES = {
  sprint:    { goal: '40 líneas', limit: CHALLENGE_MS, won: () => lines >= 40 },
  garbage:   { goal: 'Sobrevive', garbageEvery: 10000, won: () => elapsed >= CHALLENGE_MS, countdown: CHALLENGE_MS },
  fixed:     { goal: 'Limpia los grises', setup: placeFixed, won: () => !board.some(r => r.includes(FIXED)) },
  invisible: { goal: '20 líneas', invisible: true, won: () => lines >= 20 },
  reverse:   { goal: 'Nivel 5', reverseFrom: 3, won: () => level >= 5 },
};

const THEME_KEY = 'tetris-theme';
let theme = 'dark';
const SKIN_KEY = 'tetris-skin';
let skin = 'retro';
const skinSelect = document.getElementById('skin-select');
const PASTEL = {
  dark: [null, '#a8e6ef', '#fff1b8', '#d9b8e6', '#b8e6bf', '#f2b8b8', '#b8d4f2', '#f7d0a8', '#ffffff', '#f5b8cf', '#a8d9d3', '#e3ecae', '#fbe08a', '#c3cfd5', '#8a8a9a'],
  light: [null, '#7fd3e0', '#f7d56e', '#c490d6', '#92d39b', '#ee9494', '#8fbbe8', '#f2b97c', '#777777', '#ee8fb2', '#80c7bf', '#cfdc85', '#f5c75a', '#9fb2bb', '#aaaabc'],
};
const SKINS = {
  retro: {
    block(c, px, py, s, color) {
      c.fillStyle = color;
      c.fillRect(px + 1, py + 1, s - 2, s - 2);
      c.fillStyle = getCssVar('--block-shine');
      c.fillRect(px + 1, py + 1, s - 2, 4);
    },
  },
  neon: {
    palette: () => PALETTES.dark, // fondo siempre negro: colores brillantes en ambos temas
    block(c, px, py, s, color) {
      c.shadowColor = color;
      c.shadowBlur = s / 3;
      c.fillStyle = '#05050a';
      c.fillRect(px + 3, py + 3, s - 6, s - 6);
      c.strokeStyle = color;
      c.lineWidth = 2;
      c.strokeRect(px + 3, py + 3, s - 6, s - 6);
    },
  },
  pastel: {
    palette: t => PASTEL[t],
    block(c, px, py, s, color) {
      c.fillStyle = color;
      if (!c.roundRect) { c.fillRect(px + 2, py + 2, s - 4, s - 4); return; }
      c.beginPath();
      c.roundRect(px + 2, py + 2, s - 4, s - 4, s / 4);
      c.fill();
    },
  },
  pixel: {
    block(c, px, py, s, color) {
      c.fillStyle = color;
      c.fillRect(px + 1, py + 1, s - 2, s - 2);
      const u = Math.floor((s - 2) / 4);
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
        const k = (i + j) % 4; // patrón en diagonal: claro, oscuro o nada
        if (k === 0) c.fillStyle = 'rgba(255,255,255,0.3)';
        else if (k === 2) c.fillStyle = 'rgba(0,0,0,0.25)';
        else continue;
        c.fillRect(px + 1 + i * u, py + 1 + j * u, u, u);
      }
    },
  },
};

let queue, energy, choosing, previewLeft, slowLeft, held, holdUsed, spawned, undoSnap;
let board, current, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId, powerPending, freezeLeft, rewardPending, combo, lastRotate, b2b, popups, challenge, elapsed, garbageAccum;

let audioCtx;
function beep(freq, ms = 120, delay = 0) {
  try {
    audioCtx = audioCtx || new AudioContext();
    const t = audioCtx.currentTime + delay / 1000;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.06, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + ms / 1000);
  } catch (e) { /* sin audio */ }
}

function popup(text) {
  popups.push({ text, t: POPUP_MS });
}

function createBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

// 6 filas inferiores con bloques fijos y un hueco por fila (ninguna empieza completa)
function placeFixed() {
  for (let r = ROWS - 6; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) board[r][c] = Math.random() < 0.5 ? FIXED : 0;
    board[r][Math.floor(Math.random() * COLS)] = 0;
  }
}

function addGarbage() {
  if (board[0].some(v => v)) { endGame(); return; }
  board.shift();
  const row = new Array(COLS).fill(FIXED);
  row[Math.floor(Math.random() * COLS)] = 0;
  board.push(row);
  if (collide(current.shape, current.x, current.y)) current.y--;
}

function randomPiece(forced) {
  const roll = Math.random();
  const type = forced ||
    (roll < HOLLOW_CHANCE ? 13 :
     roll < HOLLOW_CHANCE + PENTO_CHANCE ? 9 + Math.floor(Math.random() * 3) :
     Math.floor(Math.random() * 7) + 1);
  const shape = PIECES[type].map(row => [...row]);
  return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
}

function powerPiece() {
  const kinds = Object.keys(POWER_ICONS);
  return { type: 8, shape: [[8]], power: kinds[Math.floor(Math.random() * kinds.length)], x: Math.floor(COLS / 2), y: 0 };
}

// Cada columna cae: los bloques se apilan abajo sin huecos
function compact() {
  for (let c = 0; c < COLS; c++) {
    const col = [];
    for (let r = ROWS - 1; r >= 0; r--) if (board[r][c]) col.push(board[r][c]);
    for (let r = ROWS - 1, i = 0; r >= 0; r--, i++) board[r][c] = col[i] || 0;
  }
}

function applyPower({ power, x, y }) {
  if (power === 'bomb') {
    for (let r = y - 1; r <= y + 1; r++)
      for (let c = x - 1; c <= x + 1; c++)
        if (r >= 0 && r < ROWS && c >= 0 && c < COLS) board[r][c] = 0;
  } else if (power === 'ray') {
    board[y].fill(0);
    for (let r = 0; r < ROWS; r++) board[r][x] = 0;
  } else if (power === 'tint') {
    const target = board[y + 1]?.[x] || Math.floor(Math.random() * 7) + 1;
    for (const row of board) for (let c = 0; c < COLS; c++) if (row[c] === target) row[c] = 0;
    compact();
  } else if (power === 'gravity') {
    compact();
  } else if (power === 'freeze') {
    freezeLeft = FREEZE_MS;
  }
}

function collide(shape, ox, oy) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

function rotateCW(shape) {
  const rows = shape.length, cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      result[c][rows - 1 - r] = shape[r][c];
  return result;
}

function tryRotate() {
  let rotated = rotateCW(current.shape);
  if (challenge?.reverseFrom && level >= challenge.reverseFrom) rotated = rotateCW(rotateCW(rotated));
  const kicks = [0, -1, 1, -2, 2];
  for (const kick of kicks) {
    if (!collide(rotated, current.x + kick, current.y)) {
      current.shape = rotated;
      current.x += kick;
      lastRotate = true;
      return;
    }
  }
}

function merge() {
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        board[current.y + r][current.x + c] = current.shape[r][c];
}

// T-spin: T girada en el último movimiento con ≥3 esquinas del 3×3 ocupadas
function isTSpin() {
  if (current.type !== 3 || !lastRotate) return false;
  let filled = 0;
  for (const [dy, dx] of [[0, 0], [0, 2], [2, 0], [2, 2]]) {
    const y = current.y + dy, x = current.x + dx;
    if (x < 0 || x >= COLS || y >= ROWS || board[y]?.[x]) filled++;
  }
  return filled >= 3;
}

function clearLines(tspin) {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(v => v !== 0)) {
      board.splice(r, 1);
      board.unshift(new Array(COLS).fill(0));
      cleared++;
      r++;
    }
  }
  if (!cleared) {
    combo = 0;
    if (tspin) { score += TSPIN_SCORES[0] * level; popup('T-SPIN'); beep(880, 150); }
    updateHUD();
    return;
  }
  if (cleared === 4) rewardPending = true;
  if (Math.floor((lines + cleared) / POWERUP_EVERY) > Math.floor(lines / POWERUP_EVERY)) powerPending = true;

  combo++;
  let base = tspin ? TSPIN_SCORES[Math.min(cleared, 3)] : LINE_SCORES[cleared] || 0;
  const difficult = cleared === 4 || tspin;
  const chained = difficult && b2b;
  if (chained) base *= B2B_MULT;
  b2b = difficult;
  score += Math.round(base * combo * level);

  if (tspin) popup(`T-SPIN ${['', 'SINGLE', 'DOUBLE', 'TRIPLE'][Math.min(cleared, 3)]}`);
  else if (cleared === 4) popup('TETRIS');
  if (chained) popup('BACK-TO-BACK x1.5');
  if (combo >= 2) popup(`COMBO x${combo}`);

  beep(330 + combo * 80);
  if (difficult) beep(660 + combo * 80, 150, 100);

  if (board.every(row => row.every(v => !v))) {
    score += PERFECT_BONUS * level;
    popup('PERFECT CLEAR');
    [523, 659, 784, 1047].forEach((f, i) => beep(f, 140, i * 110));
  }

  lines += cleared;
  const wasFull = energy >= ENERGY_MAX;
  energy = Math.min(ENERGY_MAX, energy + cleared * ENERGY_PER_LINE);
  if (!wasFull && energy >= ENERGY_MAX) { popup('ENERGÍA LLENA'); beep(988, 150, 150); }
  level = Math.floor(lines / 10) + 1;
  dropInterval = Math.max(100, 1000 - (level - 1) * 90);
  updateHUD();
}

function ghostY() {
  let gy = current.y;
  while (!collide(current.shape, current.x, gy + 1)) gy++;
  return gy;
}

function hardDrop() {
  const gy = ghostY();
  score += (gy - current.y) * 2;
  current.y = gy;
  lockPiece();
}

function softDrop() {
  if (!collide(current.shape, current.x, current.y + 1)) {
    current.y++;
    lastRotate = false;
    score += 1;
    updateHUD();
  } else {
    lockPiece();
  }
}

function lockPiece() {
  undoSnap = {
    board: board.map(r => [...r]), piece: spawned, queue: structuredClone(queue), held: structuredClone(held),
    holdUsed, score, lines, level, combo, b2b, dropInterval,
  };
  const tspin = !current.power && isTSpin();
  if (current.power) applyPower(current); else merge();
  clearLines(tspin);
  lastRotate = false;
  spawn();
}

function spawn() {
  current = queue.shift();
  if (powerPending) { queue.unshift(powerPiece()); powerPending = false; }
  else if (rewardPending) { queue.unshift(randomPiece(12)); rewardPending = false; }
  while (queue.length < QUEUE_LEN) queue.push(randomPiece());
  spawned = structuredClone(current);
  holdUsed = false;
  if (collide(current.shape, current.x, current.y)) {
    endGame();
  }
  drawNext();
}

// Reserva: guarda la pieza actual (en su orientación inicial) e intercambia con la reservada
function holdSwap() {
  if (holdUsed) return false;
  const out = held;
  held = spawned;
  if (out) {
    current = structuredClone(out);
    spawned = structuredClone(out);
    if (collide(current.shape, current.x, current.y)) endGame();
  } else spawn();
  holdUsed = true; // después de spawn(), que lo resetea
  lastRotate = false;
  drawNext();
}

const ABILITIES = [
  () => { previewLeft = PREVIEW_MS; drawNext(); },
  () => {
    const t = [1, 2, 3, 4, 5, 6, 7].filter(t => t !== current.type).sort(() => Math.random() - 0.5)
      .find(t => !collide(PIECES[t], current.x, current.y));
    if (!t) { popup('SIN ESPACIO'); return false; }
    current = { type: t, shape: PIECES[t].map(r => [...r]), x: current.x, y: current.y };
    lastRotate = false;
  },
  () => { slowLeft = SLOW_MS; },
  () => {
    if (!undoSnap) { popup('NADA QUE DESHACER'); return false; }
    const s = undoSnap;
    undoSnap = null;
    ({ board, queue, held, holdUsed, score, lines, level, combo, b2b, dropInterval } = s);
    current = structuredClone(s.piece);
    spawned = structuredClone(s.piece);
    dropAccum = 0;
    drawNext();
  },
  () => { holdUsed = false; return holdSwap(); },
];

function openAbilities() {
  choosing = true;
  cancelAnimationFrame(animId);
  abilityMenu.classList.remove('hidden');
}

function closeAbilities() {
  choosing = false;
  abilityMenu.classList.add('hidden');
  if (gameOver) return;
  lastTime = performance.now();
  loop(lastTime);
}

function useAbility(i) {
  if (ABILITIES[i]() !== false) energy = 0;
  updateHUD();
  closeAbilities();
}

function updateHUD() {
  scoreEl.textContent = score.toLocaleString();
  linesEl.textContent = lines;
  levelEl.textContent = level;
  comboEl.textContent = combo > 1 ? `x${combo}` : '—';
  energyFill.style.width = `${energy}%`;
  energyBar.classList.toggle('full', energy >= ENERGY_MAX);
}

function getCssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function setTheme(name, persist) {
  theme = name === 'light' ? 'light' : 'dark';
  document.documentElement.dataset.theme = theme;
  COLORS = SKINS[skin].palette?.(theme) || PALETTES[theme];
  const isLight = theme === 'light';
  themeBtn.setAttribute('aria-pressed', String(isLight));
  themeIcon.textContent = isLight ? '☾' : '☀';
  themeText.textContent = isLight ? 'Oscuro' : 'Claro';
  if (persist) {
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) { /* ignorar */ }
  }
  // repintar aunque el juego esté en pausa o terminado
  if (current && queue) { draw(); drawNext(); }
}

function toggleTheme() {
  setTheme(theme === 'light' ? 'dark' : 'light', true);
}

function setSkin(name, persist) {
  skin = SKINS[name] ? name : 'retro';
  document.documentElement.dataset.skin = skin;
  COLORS = SKINS[skin].palette?.(theme) || PALETTES[theme];
  skinSelect.value = skin;
  if (persist) {
    try { localStorage.setItem(SKIN_KEY, skin); } catch (e) { /* ignorar */ }
  }
  if (current && queue) { draw(); drawNext(); }
}

function drawBlock(context, x, y, colorIndex, size, alpha) {
  if (!colorIndex) return;
  context.globalAlpha = alpha ?? 1;
  SKINS[skin].block(context, x * size, y * size, size, COLORS[colorIndex]);
  context.globalAlpha = 1;
  context.shadowBlur = 0;
}

function drawGrid() {
  ctx.strokeStyle = getCssVar('--grid');
  ctx.lineWidth = 0.5;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * BLOCK, 0);
    ctx.lineTo(c * BLOCK, ROWS * BLOCK);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * BLOCK);
    ctx.lineTo(COLS * BLOCK, r * BLOCK);
    ctx.stroke();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();

  // board
  if (!(challenge?.invisible && !gameOver))
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        drawBlock(ctx, c, r, board[r][c], BLOCK);

  // ghost
  const gy = ghostY();
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2);

  // current piece
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK);
  if (current.power) drawIcon(ctx, current.x, current.y, BLOCK, current.power);

  if (freezeLeft > 0 || slowLeft > 0) {
    ctx.fillStyle = 'rgba(100, 200, 255, 0.2)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = getCssVar('--accent');
  popups.forEach((p, i) => {
    const k = p.t / POPUP_MS;
    ctx.globalAlpha = Math.min(1, k * 2);
    ctx.fillText(p.text, canvas.width / 2, canvas.height / 3 + i * 30 - (1 - k) * 40);
  });
  ctx.globalAlpha = 1;
}

function drawIcon(context, x, y, size, power) {
  context.font = `${size - 8}px serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  // el skin deja fillStyle arbitrario; el bloque power-up es claro (oscuro) u oscuro (claro, salvo neon)
  context.fillStyle = theme === 'light' && skin !== 'neon' ? '#fff' : '#111';
  context.fillText(POWER_ICONS[power], x * size + size / 2, y * size + size / 2 + 1);
}

// Dibuja una pieza centrada en una celda 4×4 (size px por bloque), desplazada slot*4 filas
function drawPreview(context, piece, size, slot = 0) {
  const shape = piece.shape;
  const offX = Math.floor((4 - shape[0].length) / 2);
  const offY = slot * 4 + Math.floor((4 - shape.length) / 2);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      drawBlock(context, offX + c, offY + r, shape[r][c], size);
  if (piece.power) drawIcon(context, offX, offY, size, piece.power);
}

function drawNext() {
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  drawPreview(nextCtx, queue[0], 30);
  queueCtx.clearRect(0, 0, queueCanvas.width, queueCanvas.height);
  queue.slice(1, QUEUE_LEN).forEach((p, i) => drawPreview(queueCtx, p, 15, i));
  queueSection.hidden = previewLeft <= 0;
  holdCtx.clearRect(0, 0, holdCanvas.width, holdCanvas.height);
  if (held) drawPreview(holdCtx, held, 30);
  holdSection.classList.toggle('locked', holdUsed);
}

function endGame(title = 'GAME OVER') {
  if (gameOver) return;
  gameOver = true;
  cancelAnimationFrame(animId);
  draw(); // revela el tablero en el desafío invisible
  overlayTitle.textContent = title;
  overlayScore.textContent = `Puntuación: ${score.toLocaleString()}`;
  overlay.classList.remove('hidden');
}

function updateGoal() {
  const left = Math.max(0, (challenge.limit || challenge.countdown || 0) - elapsed);
  const t = Math.ceil(left / 1000);
  goalEl.textContent = `${challenge.goal} · ${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
  if (!challenge.limit && !challenge.countdown) goalEl.textContent = challenge.goal;
}

function togglePause() {
  if (gameOver || choosing) return;
  paused = !paused;
  if (!paused) {
    lastTime = performance.now();
    loop(lastTime);
  } else {
    cancelAnimationFrame(animId);
    overlayTitle.textContent = 'PAUSA';
    overlayScore.textContent = '';
    overlay.classList.remove('hidden');
  }
}

function loop(ts) {
  const dt = ts - lastTime;
  lastTime = ts;
  if (freezeLeft > 0) freezeLeft -= dt; else dropAccum += slowLeft > 0 ? dt / 2 : dt;
  if (slowLeft > 0) slowLeft -= dt;
  if (previewLeft > 0 && (previewLeft -= dt) <= 0) { previewLeft = 0; drawNext(); }
  popups.forEach(p => { p.t -= dt; });
  popups = popups.filter(p => p.t > 0);
  if (challenge) {
    elapsed += dt;
    if (challenge.garbageEvery && (garbageAccum += dt) >= challenge.garbageEvery) {
      garbageAccum = 0;
      addGarbage();
    }
    updateGoal();
    if (!gameOver && challenge.won()) endGame('¡DESAFÍO COMPLETADO!');
    else if (!gameOver && challenge.limit && elapsed >= challenge.limit) endGame('TIEMPO AGOTADO');
    if (gameOver) return;
  }
  if (dropAccum >= dropInterval) {
    dropAccum = 0;
    if (!collide(current.shape, current.x, current.y + 1)) {
      current.y++;
      lastRotate = false;
    } else {
      lockPiece();
    }
  }
  draw();
  // lockPiece() puede terminar el juego dentro de este frame; no reprogramar entonces
  if (!gameOver) animId = requestAnimationFrame(loop);
}

function init() {
  board = createBoard();
  challenge = CHALLENGES[modeSelect.value] || null;
  elapsed = 0;
  garbageAccum = 0;
  goalEl.hidden = !challenge;
  if (challenge) { challenge.setup?.(); updateGoal(); }
  score = 0;
  lines = 0;
  level = 1;
  paused = false;
  gameOver = false;
  dropInterval = 1000;
  dropAccum = 0;
  powerPending = false;
  rewardPending = false;
  freezeLeft = 0;
  combo = 0;
  lastRotate = false;
  b2b = false;
  popups = [];
  lastTime = performance.now();
  energy = 0;
  choosing = false;
  previewLeft = 0;
  slowLeft = 0;
  held = null;
  holdUsed = false;
  undoSnap = null;
  abilityMenu.classList.add('hidden');
  queue = [randomPiece()];
  spawn();
  updateHUD();
  overlay.classList.add('hidden');
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

document.addEventListener('keydown', e => {
  if (e.target === themeBtn && e.code === 'Space') { e.preventDefault(); return; }
  if (e.target === modeSelect || e.target === skinSelect) return;
  if (e.code === 'KeyT') { toggleTheme(); return; }
  if (choosing) {
    if (e.code === 'Escape') closeAbilities();
    else if (/^Digit[1-5]$/.test(e.code)) useAbility(+e.code[5] - 1);
    return;
  }
  if (e.code === 'KeyP') { togglePause(); return; }
  if (paused || gameOver) return;
  switch (e.code) {
    case 'KeyE':
      if (energy >= ENERGY_MAX) openAbilities();
      break;
    case 'KeyC':
    case 'ShiftLeft':
    case 'ShiftRight':
      holdSwap();
      break;
    case 'ArrowLeft':
      if (!collide(current.shape, current.x - 1, current.y)) { current.x--; lastRotate = false; }
      break;
    case 'ArrowRight':
      if (!collide(current.shape, current.x + 1, current.y)) { current.x++; lastRotate = false; }
      break;
    case 'ArrowDown':
      softDrop();
      break;
    case 'ArrowUp':
    case 'KeyX':
      tryRotate();
      break;
    case 'Space':
      e.preventDefault();
      hardDrop();
      break;
  }
  updateHUD();
});

restartBtn.addEventListener('click', init);
abilityMenu.addEventListener('click', e => {
  const i = e.target.dataset.i;
  if (i !== undefined) useAbility(+i);
  e.target.blur?.();
});
modeSelect.addEventListener('change', () => { init(); modeSelect.blur(); });
themeBtn.addEventListener('click', () => { toggleTheme(); themeBtn.blur(); });

// El tema se carga una sola vez (no en init) para que reiniciar no lo resetee
let savedTheme = null;
try { savedTheme = localStorage.getItem(THEME_KEY); } catch (e) { /* ignorar */ }
setTheme(savedTheme === 'light' ? 'light' : 'dark', false);
let savedSkin = null;
try { savedSkin = localStorage.getItem(SKIN_KEY); } catch (e) { /* ignorar */ }
setSkin(savedSkin, false);
skinSelect.addEventListener('change', () => { setSkin(skinSelect.value, true); skinSelect.blur(); });

init();
