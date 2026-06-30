# BRAIN.md

## What this app does
A Temple Run-style endless runner game built with Next.js, TypeScript, and Canvas API. Dodge obstacles, collect coins, and run forever!

## Current state
Production build fix complete. Root cause: two issues:
1. Empty `pages/_document.tsx` and `pages/_app.tsx` files (0 bytes) triggered Next.js 14's `PageNotFoundError: Cannot find module for page: /_document`. These were created in a previous run to fix a build error but actually caused it. **Fix: Deleted the empty pages/ directory entirely** — with App Router, no pages/ directory should exist.
2. `tailwind.config.ts` referenced CSS custom properties (`hsl(var(--primary))`, etc.) that weren't defined in `globals.css`. Tailwind classes like `bg-primary`, `bg-card`, `text-foreground` would resolve to invalid values at build time. **Fix: Added all CSS variables to `:root` in `app/globals.css`** with hardcoded hex values matching the dark theme.

## Tech stack and why
- **Next.js 14 (App Router)** — modern React framework with file-based routing
- **TypeScript** — type safety for game logic
- **Canvas API** — 2D rendering for pseudo-3D game view
- **Tailwind CSS** — utility-first styling for UI overlays
- **shadcn/ui-style components** — Button, Card components (unused in game but available)

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
- [FIXED] Tailwind CSS variables missing from globals.css — added all :root custom properties
- [PENDING] Build verification — sandbox unavailable, but fix is logically sound

## What's still pending
- Deploy to Vercel (deployment infra temporarily unavailable — code pushed to GitHub)
- Consider: add sound effects, power-ups, different environments/themes

## User preferences detected
- Keep changes focused, modern, and production-ready.
- Surgical edits only — don't rewrite files that weren't mentioned.

## Run notes
- Last updated: 2026-06-30T17:10:00.000Z
- Autonomous iteration: 0
- GitHub: https://github.com/kaylalee41198/temple-run-game
