# Project Index — gametest

## Overview

2D Sonic-style platformer built with TypeScript + PixiJS v8, Vite, and pnpm.

## Structure

| Directory | Purpose |
|-----------|---------|
| `src/core/` | Game loop (fixed 60fps), state machine |
| `src/physics/` | Sonic momentum physics, 6-sensor raycasting, AABB collision |
| `src/entities/` | Player, enemies (Crab, Bee), Ring, Spring |
| `src/level/` | Tile system with heightmaps, 2 level definitions, loader |
| `src/rendering/` | Sprites, animation, chroma-key filter, parallax, HUD, particles |
| `src/scenes/` | Scene manager, title screen, gameplay scene |
| `public/assets/` | Backgrounds, spritesheets, tilesets |
| `documentation/` | Conventions & design plans |
| `generated/` | AI-generated sprite source images |

## Key Files

- **`main.ts`** — Entry point, PixiJS init, asset loading, scene setup
- **`constants.ts`** — All physics tuning values
- **`input.ts`** — Keyboard input with 4-frame buffering
- **`camera.ts`** — Sonic-style camera with speed-based lookahead

### Core
- **`core/GameLoop.ts`** — Fixed 60 FPS accumulator loop
- **`core/StateMachine.ts`** — Generic state machine for Player

### Physics
- **`physics/SonicPhysics.ts`** — Core momentum engine (ground speed, slopes, rolling, spin dash)
- **`physics/SensorSystem.ts`** — 6-sensor floor/wall/ceiling raycasting
- **`physics/CollisionDetection.ts`** — Player-entity AABB overlap

### Entities
- **`entities/Player.ts`** — 7-state player (idle, running, jumping, rolling, crouching, spindash, falling)
- **`entities/Enemy.ts`** — Abstract enemy base class
- **`entities/EnemyCrab.ts`** — Patrolling ground enemy
- **`entities/EnemyBee.ts`** — Flying sinusoidal enemy
- **`entities/Ring.ts`** — Collectible rings + ScatteredRing on damage
- **`entities/Spring.ts`** — Bounce pads (yellow/red)

### Level
- **`level/Tile.ts`** — 10 tile types with per-tile heightmaps and surface angles
- **`level/TileMap.ts`** — Tile grid renderer with height queries
- **`level/LevelData.ts`** — Two levels: Green Hill (200x30) and Mechanical Plant (200x30)
- **`level/LevelLoader.ts`** — Instantiates levels from definitions

### Rendering
- **`rendering/SpriteManager.ts`** — Spritesheet loading, caching, frame definitions
- **`rendering/AnimationController.ts`** — Frame-based animation with speed multiplier
- **`rendering/ChromaKeyFilter.ts`** — GLSL magenta removal for AI-generated sprites
- **`rendering/ParallaxBackground.ts`** — Dual-layer parallax scrolling
- **`rendering/HUD.ts`** — Score, rings, time, level name overlay
- **`rendering/Particles.ts`** — Dust, sparkles, poofs, spin dash sparks

### Scenes
- **`scenes/SceneManager.ts`** — Scene transitions
- **`scenes/TitleScene.ts`** — Title/menu screen
- **`scenes/GameScene.ts`** — Main gameplay loop, entity management, collision

## Commands

```bash
pnpm dev      # Dev server with HMR
pnpm build    # TypeScript check + Vite build
pnpm preview  # Preview built game
pnpm format   # Run Prettier on src/ and index.html
```

## Dependencies

**Runtime:** pixi.js v8.17.1, pixi-filters v6.1.5
**Dev:** typescript v6.0.2, vite v8.0.3, prettier v3.8.1, mcp-image v0.10.0 (patched)

## Architecture Highlights

- **Sensor-based collision** matching classic Sonic, with per-tile heightmaps for pixel-perfect slopes
- **GameEntity interface** for all game objects (update/render/collision)
- **Fixed timestep** (60 FPS physics) with variable rendering via accumulator
- **Chroma-key filtering** removes magenta backgrounds from AI-generated sprites
- **No magic numbers** — all physics tuning in `constants.ts`
- **Import order** convention: pixi.js -> core -> physics -> rendering -> entities -> local
