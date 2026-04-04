# Plan: Replace Pixi.js with Custom WebGL Renderer

## Context

The game is a Sonic platformer using pixi.js v8 for all rendering. 15 files import from pixi.js. The goal is to rip out pixi.js entirely and replace it with a minimal immediate-mode WebGL2 batch renderer that draws textured quads with arbitrary UVs, plus a new spritesheet system built on top.

## Architecture

**Immediate-mode batch renderer** instead of Pixi's scene graph. Each frame: `begin()` -> draw calls -> `end()`. The renderer batches quads by texture and flushes on texture change. No `Container`, no `Sprite` objects -- just draw calls.

**Unified shader** with built-in chroma key support (per-vertex flag). A 1x1 white pixel texture unifies colored rects and textured sprites into one pipeline.

**Canvas 2D for text** -- render text strings to an offscreen canvas, upload as GL texture, draw as a textured quad.

## New Files (4)

### 1. `src/rendering/WebGLRenderer.ts`
- Creates `<canvas>` and `WebGL2RenderingContext`
- Single shader program (GLSL 300 es) with chroma key built in
- Vertex format: position(2) + texcoord(2) + color(4) + chromaKey(1) = 9 floats/vertex
- Batches quads as 6 vertices (2 triangles) into a dynamic `Float32Array` (~4000 quad capacity)
- Flushes batch on texture change or `end()`
- `setOffset(x,y)` / `resetOffset()` for camera translation (replaces Container positioning)
- Handles devicePixelRatio: canvas sized at physical pixels, projection at logical 800x450
- API:
  - `begin()`, `end()`
  - `drawSprite(texture, x, y, w, h, u0, v0, u1, v1, alpha?, flipX?, chromaKey?)`
  - `drawRect(x, y, w, h, r, g, b, a)`
  - `setOffset(x, y)`, `resetOffset()`
  - `loadTexture(url): Promise<GLTexture>`
  - `createTextureFromCanvas(canvas): GLTexture`, `updateTextureFromCanvas(texture, canvas)`

### 2. `src/rendering/SpriteSheet.ts`
- `Frame` type: `{ texture: GLTexture, u0, v0, u1, v1 }` (normalized UVs)
- `SpriteSheet` class: takes a `GLTexture` + grid definition (cols, rows, frameNames, animations)
- Computes UVs from grid position: `u0 = col/cols`, `v0 = row/rows`, etc.
- Replaces Pixi's `Spritesheet` + `SpritesheetData`

### 3. `src/rendering/TextRenderer.ts`
- Offscreen `<canvas>` + 2D context for text rendering
- `drawText(renderer, text, style, x, y, anchorX?, anchorY?)`
- Caches GL textures by text+style key, re-renders only when text changes
- Replaces Pixi's `Text` + `TextStyle`

### 4. `src/rendering/AssetLoader.ts` (replaces `SpriteManager.ts`)
- Loads all 7 JPG textures via `renderer.loadTexture()`
- Builds `SpriteSheet` instances for each atlas
- Exports same accessor API but returns `Frame` instead of Pixi `Texture`:
  - `getPlayerFrame(name)`, `getEnemyFrame(type, idx)`, `getRingFrame(idx)`, `getSpringFrame(color, compressed)`, `getTileFrame(tileId, tileset)`
- `applyChromaKey()` removed -- chroma key is a draw-time flag

## Deleted Files (2)
- `src/rendering/ChromaKeyFilter.ts` -- absorbed into main shader
- `src/rendering/SpriteManager.ts` -- replaced by AssetLoader.ts

## Modified Files (14)

### Entities (render takes renderer, no more Sprite/Container)
- **`entities/Player.ts`** -- remove Sprite/Container, `render(renderer)` calls `renderer.drawSprite(frame, ...)` with `chromaKey: true`, flip via `flipX` param. Remove `addToContainer()`.
- **`entities/Enemy.ts`** -- same pattern. Add `protected flipX = false` field. `render(renderer)` draws enemy frame.
- **`entities/EnemyCrab.ts`** -- set `this.flipX` based on direction instead of `sprite.scale.x`
- **`entities/EnemyBee.ts`** -- no pixi imports, just inherits updated Enemy
- **`entities/Ring.ts`** -- Ring: draw ring frame. ScatteredRing: `drawRect()` (yellow square instead of circle). Remove `addToContainer()`.
- **`entities/Spring.ts`** -- draw spring frame. Remove `addToContainer()`.

### Level
- **`level/LevelLoader.ts`** -- `GameEntity` interface: remove `addToContainer(Container)`, change `render()` to `render(renderer: WebGLRenderer)`. Remove Container creation. `LoadedLevel` drops `container` field.
- **`level/TileMap.ts`** -- remove Container/Sprite. Add `render(renderer)` that iterates grid with viewport culling (only draw visible tiles). No pre-built sprites.

### Rendering
- **`rendering/ParallaxBackground.ts`** -- store background `Frame`, draw two quads with position wrapping. Remove Container/Sprite.
- **`rendering/HUD.ts`** -- use TextRenderer for score/rings/time/level text. Remove Container/Text.
- **`rendering/Particles.ts`** -- `render(renderer)` draws colored rects via `drawRect()`. Store RGB floats on Particle struct. Remove Container/Graphics.
- **`rendering/AnimationController.ts`** -- no changes (works with string frame names)

### Scenes
- **`scenes/SceneManager.ts`** -- store `WebGLRenderer` instead of `Application`. Scene interface: `render(interpolation, renderer)`. No stage/container management.
- **`scenes/GameScene.ts`** -- `render()` explicitly draws in order: background, `renderer.setOffset(-cam.x, -cam.y)`, tiles, entities, particles, `renderer.resetOffset()`, HUD. No Container hierarchy.
- **`scenes/TitleScene.ts`** -- draw text via TextRenderer. Blink = skip draw call.

### Entry point
- **`main.ts`** -- `new WebGLRenderer(800, 450)` instead of `new Application()`. Append `renderer.canvas`. Game loop wraps render in `renderer.begin()`/`renderer.end()`.

## Package cleanup
- Remove `pixi.js` and `pixi-filters` from `package.json`

## Implementation Order

1. Create `WebGLRenderer.ts` (GL context, shader, batch system)
2. Create `SpriteSheet.ts` (Frame type, grid UV computation)
3. Create `TextRenderer.ts` (canvas 2D text to GL texture)
4. Create `AssetLoader.ts` (port SpriteManager loading, new types)
5. Migrate rendering helpers: Particles, HUD, ParallaxBackground, TileMap
6. Migrate LevelLoader (interface change) + all entities
7. Migrate scenes (SceneManager, GameScene, TitleScene)
8. Migrate main.ts entry point
9. Delete ChromaKeyFilter.ts, SpriteManager.ts
10. Remove pixi.js/pixi-filters from package.json, reinstall
11. Review rendering code and architecture and propose 5-10 ways to improve them.

## Verification

1. `npx tsc --noEmit` -- should compile with no errors and no pixi.js imports
2. `npm run dev` -- game should render identically:
   - Title screen with blinking text
   - Background parallax scrolling
   - Tiles rendering with correct textures
   - Player sprite with animation, flipping, chroma key transparency
   - Enemies animating and moving
   - Rings bobbing and animating
   - Springs compressing on bounce
   - Particles (dust, sparkles, poofs)
   - HUD text updating
   - Camera following player
3. `grep -r "pixi" src/` -- should return nothing
4. Check `package.json` has no pixi dependencies
