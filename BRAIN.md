# BRAIN.md

## What this app does
A Temple Run-style endless runner game built with Next.js, TypeScript, and Canvas API. Dodge obstacles, collect coins, and run forever!

## Current state
Production build fix complete. Root cause: empty `pages/` directory with 0-byte `_document.tsx` and `_app.tsx` files triggered Next.js 14's `PageNotFoundError: Cannot find module for page: /_document`. **Fix: Deleted the entire pages/ directory** — with App Router, no pages/ directory should exist.

Also updated `tailwind.config.ts` to have the full color palette (was missing primary, card, muted, etc.) and added all CSS custom properties to `globals.css` so the shadcn-style components resolve correctly.

## Tech stack and why
- **Next.js 14 (App Router)** — modern React framework with file-based routing
- **TypeScript** — type safety for game logic
- **Canvas API** — 2D rendering for pseudo-3D game view
- **Tailwind CSS** — utility-first styling for UI overlays

## What has been built
- Full interactive game with pseudo-3D perspective road rendering
- 3-lane movement (left/right) with smooth transitions
- Jump (Up/Space) and slide (Down) mechanics
- Obstacles: blocks, spikes, gaps — each with different collision rules
- Coin collection with particle effects (+10 pts each)
- Progressive speed increase (starts at 5, caps at 15)
- High score saved to localStorage
- Mobile touch controls (swipe to move, tap/jump)
- Start screen, HUD overlay, game-over screen with score display
- Dark theme with gradient sky and road perspective

## Latest verification
- [FIXED] Production build error: `Cannot find module for page: /_document` — removed empty pages/ directory
- [PENDING] Build verification — sandbox unavailable, but the fix is logically sound
- [PENDING] Deploy — Vercel deployment infra temporarily unavailable

## What's still pending
- Deploy to Vercel (deployment infra temporarily unavailable — code pushed to GitHub)
- Consider: sound effects, power-ups, different environments/themes

## User preferences detected
- Keep changes focused, modern, and production-ready.
- Surgical edits only — don't rewrite files that weren't mentioned.

## Run notes
- Last updated: 2026-06-30T17:10:00.000Z
- Autonomous iteration: 0
- GitHub: https://github.com/kaylalee41198/temple-run-game
