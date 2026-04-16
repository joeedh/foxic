# Fix Documentation Errors

## Context

The documentation files in `documentation/` contain outdated references from before the pixi.js-to-custom-WebGL2 migration, broken markdown syntax, and a package manager inconsistency. These errors could mislead contributors.

## Files to Modify

### 1. `documentation/Conventions.md`

**Lines 19-23 — "Sprites and Animation" section is outdated (pixi.js references):**

- **Line 19:** Says "Spritesheets use PixiJS `Spritesheet` class" — pixi.js has been fully replaced. Should reference the custom `SpriteSheet` class in `src/rendering/SpriteSheet.ts`.
- **Line 20:** References `src/rendering/SpriteManager.ts` with `buildSheetData()` — this file does not exist. Frame definitions are created via `SpriteSheet` constructor in `src/rendering/AssetLoader.ts`.
- **Line 22:** References `ChromaKeyFilter` — does not exist. Chroma key is baked at load time via `WebGLRenderer.bakeChromaKey()` using an FBO render pass, not a per-sprite filter.

**Replacement for lines 19-23:**
```markdown
# Sprites and Animation

* Spritesheets use the custom `SpriteSheet` class (`src/rendering/SpriteSheet.ts`) with `SheetDef` grid definitions
* Frame data is defined in `src/rendering/AssetLoader.ts` via `new SpriteSheet()` constructor calls
* Use `AnimationController` for frame-based animation with `ticksPerFrame` timing
* Generated sprites use magenta (#FF00FF) backgrounds — `WebGLRenderer.bakeChromaKey()` removes them at load time via an FBO render pass
```

### 2. `documentation/ProjectIndex.md`

**Lines 68-73 — Commands section uses `npm` instead of `pnpm`:**

Change all `npm run` to `pnpm` to match AGENTS.md and the rest of the documentation.

### 3. `documentation/codeStyle.md`

**Line 92:** Code fence uses `` ```\typescript `` — remove backslash to `` ```typescript ``
**Line 106:** Same issue — `` ```\typescript `` → `` ```typescript ``
**After line 115:** Missing closing `` ``` `` — add it

## Verification

- Visually review each changed file for correct markdown rendering
- Confirm no remaining references to pixi.js, SpriteManager, ChromaKeyFilter, or `npm run` in the documentation folder
