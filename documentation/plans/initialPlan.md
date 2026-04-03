# 2D Sonic-Style Platformer Game

## Context
Build a 2D Sonic-style platformer from scratch in the existing `C:\dev\gametest` project. The project currently has only config files and an MCP image generation tool. The user wants full momentum-based Sonic physics, PixiJS WebGL rendering, generated pixel art, and a complete game with enemies, collectibles, and multiple levels.

## Tech Stack
- **Rendering**: PixiJS v8 (WebGL)
- **Build**: Vite + TypeScript
- **Formatting**: Prettier (per AGENTS.md)
- **Art**: MCP image generation tool for pixel art sprites
- **Package manager**: pnpm (already configured)

## Formatting
Code formatting will be done with prettier.
Install prettier, create a .prettierrc file and set prettier
up to run on `pnpm format`.

## Project Structure
```
index.html                          # Vite entry point
vite.config.ts
tsconfig.json
src/
  main.ts                           # Init PixiJS, start game
  constants.ts                      # All physics tuning values
  input.ts                          # Keyboard input manager
  camera.ts                         # Sonic-style camera (lookahead, lag)
  core/
    GameLoop.ts                     # Fixed 60 FPS timestep
    StateMachine.ts                 # Generic state machine
  physics/
    SonicPhysics.ts                 # Core momentum physics
    CollisionDetection.ts           # Sensor-to-tilemap collision
    SensorSystem.ts                 # 6-sensor raycasting (A-F)
  entities/
    Player.ts                       # Player with state machine + physics
    Enemy.ts                        # Base enemy
    EnemyCrab.ts                    # Patrol enemy
    EnemyBee.ts                     # Flying enemy
    Ring.ts                         # Collectible ring
    Spring.ts                       # Bounce pad
  level/
    TileMap.ts                      # Tile grid + heightmap storage
    LevelLoader.ts                  # Instantiate level from data
    LevelData.ts                    # Inline level definitions
    Tile.ts                         # Tile types with height arrays + angles
  rendering/
    SpriteManager.ts                # Load/cache textures
    ParallaxBackground.ts           # Multi-layer scrolling
    HUD.ts                          # Score, rings, time
    AnimationController.ts          # Frame-based sprite animation
  scenes/
    SceneManager.ts                 # Scene transitions
    TitleScene.ts                   # Title screen
    GameScene.ts                    # Main gameplay
public/assets/sprites/              # Generated pixel art
public/assets/tiles/
public/assets/backgrounds/
```

## Sonic Physics Design

### Core Concept
Player has a single `groundSpeed` on the ground, projected to X/Y via surface angle:
- `xSpeed = groundSpeed * cos(angle)`
- `ySpeed = groundSpeed * -sin(angle)`

### Key Constants (pixels/frame at 60 FPS)
| Constant | Value | Purpose |
|----------|-------|---------|
| ACCELERATION | 0.046875 | Ground accel |
| DECELERATION | 0.5 | Braking |
| FRICTION | 0.046875 | Passive slowdown |
| TOP_SPEED | 6.0 | Max ground speed |
| JUMP_FORCE | -6.5 | Initial jump velocity |
| GRAVITY | 0.21875 | Per-frame gravity |
| SLOPE_FACTOR | 0.125 | Slope gravity effect |
| SPINDASH_BASE | 8.0 | Base spin dash speed |

### Player States
Idle -> Running -> Rolling -> Jumping -> Falling
Plus: Crouching, SpinDash (charge + release)

### Sensor System (6 sensors)
- **A/B** (floor): Two downward rays, detect ground height + angle
- **C/D** (wall): Two horizontal rays at mid-height
- **E/F** (ceiling): Two upward rays

### Tile Heightmaps
Each 16x16 tile stores a height array (16 values) + angle. Enables pixel-perfect slope detection matching classic Sonic.

## Implementation Phases

### Phase 1: Project Scaffold
1. Install deps: `pnpm add pixi.js`, `pnpm add -D typescript vite prettier`
2. Create `tsconfig.json` (with `strictNullChecks: true`), `vite.config.ts`, `index.html`, `.prettierrc`
3. Create `src/main.ts` -- init PixiJS, render a test rectangle
4. **Verify**: `pnpm dev` shows canvas with rectangle

### Phase 2: Input + Game Loop
5. Create `src/input.ts` (keyboard state: pressed/justPressed/justReleased)
6. Create `src/core/GameLoop.ts` (fixed timestep accumulator)
7. Move rectangle with arrow keys
8. **Verify**: arrow keys move rectangle

### Phase 3: Tile Map + Camera
9. Create `src/level/Tile.ts` (tile type registry with height arrays + angles)
10. Create `src/level/TileMap.ts` (render tiles, height lookup)
11. Create `src/level/LevelData.ts` (small test level: flat ground + slope)
12. Create `src/camera.ts` (follow player with Sonic-style behavior)
13. **Verify**: player sits on rendered tiles, camera follows

### Phase 4: Sonic Physics (most complex phase)
14. Create `src/constants.ts`
15. Create `src/physics/SensorSystem.ts` (6-sensor raycasting)
16. Create `src/physics/CollisionDetection.ts`
17. Create `src/physics/SonicPhysics.ts` (ground/air movement, slopes)
18. Create `src/core/StateMachine.ts`
19. Create `src/entities/Player.ts` (integrate everything)
20. **Verify**: run, jump, slope physics, momentum, spin dash all work

### Phase 5: Review architecture and propose refactors
21. Install typescript language server.
22. Review all data structures and find ways to simplify and clarify
    code.  Look at things at both a high level and from the perspective of 
    programmers working in the codebase.
23. Propose at most 5 code refactors

### Phase 6: Art Generation
24. Generate sprites via MCP: player sheet, tileset, enemies, rings, springs, backgrounds
25. Create `src/rendering/SpriteManager.ts`, `AnimationController.ts`
26. Replace rectangles with real sprites
27. **Verify**: game renders with pixel art

### Phase 7: Entities
28. Create Ring, EnemyCrab, EnemyBee, Spring entities
29. Add player-entity collision (damage, collection, enemy defeat)
30. Add ring scattering on damage
31. **Verify**: collect rings, defeat enemies, take damage

### Phase 7: HUD + Backgrounds
32. Create HUD (score, rings, time)
33. Create ParallaxBackground (3-layer scrolling)
34. Add scoring system
35. **Verify**: HUD updates, backgrounds scroll

### Phase 8: Levels + Scenes
36. Create SceneManager, TitleScene, GameScene
37. Design Level 1 (Green Hill-style, ~200 tiles wide)
38. Design Level 2 (industrial-style)
39. Create LevelLoader, add level transitions
40. **Verify**: full playthrough title -> level 1 -> level 2

### Phase 9: Polish
41. Refine camera (lookahead, vertical limits)
42. Add particle effects (dust, sparkles)
43. Run `pnpm format`
44. **Verify**: complete smooth playthrough

## Verification
- Run `pnpm dev` after each phase to test in browser
- Test physics: slopes slow uphill / accelerate downhill, jump arcs feel right, spin dash launches at high speed
- Test entities: rings collectable, enemies killable from above, damage scatters rings
- Test levels: complete both levels from start to finish
- Test scenes: title -> gameplay -> level transition works
