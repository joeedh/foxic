# Project Index — gametest

## Overview

2D Sonic-style platformer built with TypeScript, a custom WebGL2 renderer, and Vite. Features momentum-based physics, tile-based levels with per-tile heightmaps, and an immediate-mode batch rendering pipeline.

## Structure

```
src/
├── main.ts                    # Entry point: renderer, assets, game loop
├── constants.ts               # All physics tuning values
├── input.ts                   # Keyboard input with press buffering
├── camera.ts                  # Speed-based camera lookahead
├── core/                      # GameLoop (fixed 60 FPS), StateMachine
├── physics/                   # SonicPhysics, SensorSystem, CollisionDetection
├── entities/                  # Player (7 states), EnemyCrab, EnemyBee, Ring, Spring
├── level/                     # Tile system, heightmaps, 2 levels (Green Hill, Mechanical Plant)
├── rendering/                 # Custom WebGL2 renderer, sprite batching, particles, HUD
│   └── WebGL/                 # Low-level GL: shaders, textures, vertex arrays
├── scenes/                    # SceneManager, TitleScene, GameScene
└── util/                      # Utilities
```

| Directory | Purpose |
|-----------|---------|
| `src/core/` | Game loop (fixed 60fps), state machine |
| `src/physics/` | Sonic momentum physics, 6-sensor raycasting, AABB collision |
| `src/entities/` | Player, enemies (Crab, Bee), Ring, Spring |
| `src/level/` | Tile system with heightmaps, 2 level definitions, loader |
| `src/rendering/` | Custom WebGL2 batch renderer, spritesheet system, text, parallax, HUD, particles |
| `src/rendering/WebGL/` | Low-level WebGL2 utilities: shader programs, textures, vertex arrays, draw calls |
| `src/scenes/` | Scene manager, title screen, gameplay scene |
| `src/util/` | Utility functions (hash digest) |
| `public/assets/` | Backgrounds, spritesheets, tilesets, audio |
| `documentation/` | Conventions, code style, design plans |
| `generated/` | AI-generated sprite source images |
| `tests/playwright/` | End-to-end tests |

## Key Files

- **`main.ts`** -- Entry point, WebGL renderer init, asset loading, scene setup
- **`constants.ts`** -- All physics tuning values
- **`input.ts`** -- Keyboard input with configurable press buffering
- **`camera.ts`** -- Sonic-style camera with speed-based lookahead

### Core

- **`core/GameLoop.ts`** -- Fixed 60 FPS accumulator loop
- **`core/StateMachine.ts`** -- Generic state machine for Player

### Physics

- **`physics/SonicPhysics.ts`** -- Core momentum engine (ground speed, slopes, rolling, spin dash)
- **`physics/SensorSystem.ts`** -- 6-sensor floor/wall/ceiling raycasting
- **`physics/CollisionDetection.ts`** -- Player-entity AABB overlap

### Entities

- **`entities/Player.ts`** -- 7-state player (idle, running, jumping, rolling, crouching, spindash, falling)
- **`entities/Enemy.ts`** -- Abstract enemy base class
- **`entities/EnemyCrab.ts`** -- Patrolling ground enemy
- **`entities/EnemyBee.ts`** -- Flying sinusoidal enemy
- **`entities/Ring.ts`** -- Collectible rings + ScatteredRing on damage
- **`entities/Spring.ts`** -- Bounce pads (yellow/red)

### Level

- **`level/Tile.ts`** -- 10 tile types with per-tile heightmaps and surface angles
- **`level/TileMap.ts`** -- Tile grid with viewport-culled rendering and height queries
- **`level/LevelData.ts`** -- Two levels: Green Hill (200x30) and Mechanical Plant (200x30)
- **`level/LevelLoader.ts`** -- Instantiates levels from definitions, defines GameEntity interface

### Rendering

- **`rendering/WebGLRenderer.ts`** -- Immediate-mode WebGL2 batch renderer with index buffer, textured quads, tint, rotation, camera offset, FBO render targets, chroma-key baking, and debug stats
- **`rendering/WebGL/webgl.ts`** -- WebGL2 context wrapper
- **`rendering/WebGL/shaderprogram.ts`** -- Shader program compilation and uniform management
- **`rendering/WebGL/texture.ts`** -- Texture creation and management
- **`rendering/WebGL/vertexArray.ts`** -- Vertex array object wrapper
- **`rendering/WebGL/gpuDrawElements.ts`** -- Draw call abstraction
- **`rendering/SpriteBatch.ts`** -- Sprite batching system
- **`rendering/SpriteSheet.ts`** -- Frame type (texture + UV rect) and grid-based spritesheet builder with optional border trim
- **`rendering/AssetLoader.ts`** -- Loads all textures, builds spritesheets, pre-bakes chroma key at load time, creates circle texture
- **`rendering/TextRenderer.ts`** -- Canvas 2D text rendering to GL textures with LRU cache eviction
- **`rendering/AnimationController.ts`** -- Frame-based animation with speed multiplier
- **`rendering/ParallaxBackground.ts`** -- Dual-layer parallax scrolling
- **`rendering/HUD.ts`** -- Score, rings, time, level name overlay
- **`rendering/Particles.ts`** -- Dust, sparkles, poofs, spin dash sparks (rendered as colored quads)
- **`rendering/spriteShaders.ts`** -- Custom shader definitions
- **`rendering/GenerativeAsset.ts`** -- AI sprite generation tracking
- **`rendering/GenerativeAssetData.ts`** -- Sprite metadata storage (with promptHistory)

### Scenes

- **`scenes/SceneManager.ts`** -- Scene transitions, holds renderer reference
- **`scenes/TitleScene.ts`** -- Title/menu screen
- **`scenes/GameScene.ts`** -- Main gameplay loop, entity management, collision

## Key Systems & Relationships

```
main.ts (entry point)
  |
  WebGLRenderer (canvas, shaders, batching)
  |
  SceneManager
  |-- TitleScene (menu)
  +-- GameScene (gameplay loop)
       |-- GameLoop (fixed 60 FPS, accumulator pattern)
       |-- SonicPhysics + SensorSystem (collision, movement)
       |-- Player (state machine)
       |-- GameEntity[] (enemies, rings, springs)
       |-- TileMap (level collision)
       +-- Camera (speed-based lookahead)

Input Flow:
  pollInput() -> input.ts state -> Player.update() -> physics response

Rendering Pipeline:
  renderer.begin()
  -> scene.render(interpolation)
    -> background (parallax)
    -> tile map (viewport culled)
    -> entities (with animation)
    -> HUD (score, rings, time)
    -> particles (dust, sparkles)
  -> renderer.end() (flushes batch)
```

## Commands

```bash
pnpm dev         # Dev server with HMR (localhost:5173)
pnpm build       # TypeScript check + Vite build
pnpm preview     # Preview built game
pnpm format      # Run Prettier on src/ and index.html
pnpm typecheck   # TypeScript check only (tsc --noEmit)
pnpm playwright  # Run Playwright E2E tests
```

## Dependencies

**Runtime:** none (custom WebGL2 renderer)
**Dev:** typescript v6.0.2, vite v8.0.3, prettier v3.8.1, playwright v1.59.1, mcp-image v0.10.0

## Architecture Highlights

- **Custom WebGL2 renderer** -- Immediate-mode batch renderer drawing textured quads with arbitrary UVs, replacing pixi.js. Single shader with per-vertex color/tint, rotation, and chroma-key support. Uses index buffer (4 verts/quad) and auto-flushes on texture change.
- **Low-level WebGL abstraction** -- `WebGL/` directory provides thin wrappers around shader programs, textures, vertex arrays, and draw calls.
- **Spritesheet system** -- `Frame` type stores texture + UV coordinates. `SpriteSheet` class computes UVs from grid definitions. Chroma key is pre-baked into sprite textures at load time (FBO render pass) so no per-fragment branching at runtime.
- **Render-to-texture** -- FBO support via `createRenderTarget`/`pushRenderTarget`/`popRenderTarget` for offscreen rendering and post-processing.
- **Text rendering** -- Canvas 2D renders text to GL textures, cached with LRU eviction (max 64 entries).
- **Sensor-based collision** matching classic Sonic, with per-tile heightmaps for pixel-perfect slopes.
- **GameEntity interface** for all game objects (update/render/collision).
- **Fixed timestep** (60 FPS physics) with variable rendering via accumulator.
- **No magic numbers** -- all physics tuning in `constants.ts`.
- **Generative assets** -- AI-generated sprites tracked via GenerativeAsset/GenerativeAssetData with prompt history.
- **Import order** convention: rendering -> core -> physics -> entities -> local.

## Testing

- **Playwright E2E** -- `tests/playwright/level-load.spec.ts`
- Chromium with SwiftShader for CI/CD
- Dev server auto-started on :5173
