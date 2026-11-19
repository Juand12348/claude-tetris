# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Vanilla JS Tetris (HTML5 Canvas). No `package.json`, no build, no linter, no tests. Docs in `README.md` are in Spanish.

## Running

Open `index.html` directly, or serve statically (e.g. `python -m http.server 8000`, `npx serve .`) and visit `http://localhost:8000`. Verify changes by playing in the browser.

## Architecture

Three files: `index.html` (DOM + two canvases + overlay), `style.css`, and `game.js` (all logic, one global script, `'use strict'`, no modules).

- **State** lives in module-level `let` variables declared on one line in `game.js` and reset by `init()` (also the restart button handler). Add new state there and reset it in `init()`.
- **Board** is a `ROWS×COLS` matrix of `0` or a color/piece index 1–7. `PIECES` and `COLORS` are indexed by the same 1–7 type, so a piece's shape cells hold its own type number.
- **Loop**: `loop(ts)` (requestAnimationFrame) accumulates `dropAccum` against `dropInterval`, then gravity-drops or calls `lockPiece()` → `merge()` → `clearLines()` → `spawn()`. `spawn()` triggers `endGame()` if the new piece collides. Pause/game over work by `cancelAnimationFrame(animId)`; `togglePause` restarts `loop` manually.
- **Input**: a single `keydown` listener at the bottom (uses `e.code`); calls `updateHUD()` after every key.
- **Rendering**: `draw()` repaints the whole board each frame (grid, board, ghost via `ghostY()`, current piece); `drawNext()` renders the preview on `#next-canvas`.
- Canvas size is coupled to constants: `#board` in `index.html` must equal `COLS*BLOCK × ROWS*BLOCK` (300×600) if those change. `#next-canvas` (120×120) assumes a 4×4 grid at 30px (`NB` in `drawNext`).
- Scoring/levels: `LINE_SCORES[cleared] * level`; hard drop +2/cell, soft drop +1/cell; level = `floor(lines/10)+1`; `dropInterval = max(100, 1000 - (level-1)*90)` — this formula is duplicated in `clearLines` and the initial `1000` in `init()`.
- Theme: dark by default, light via `:root[data-theme="light"]`. All CSS colors are variables in `style.css`. `setTheme()` in `game.js` sets the attribute, swaps `COLORS` (from `PALETTES`), persists to `localStorage` (`tetris-theme`) and repaints; canvas grid/shine colors are read from CSS vars. Toggle via `#theme-toggle` button or `T` key. Theme is loaded once at startup, not in `init()`.
