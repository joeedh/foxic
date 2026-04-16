# Architecture Rules

* All gameplay objects implement the `GameEntity` interface (defined in `src/level/LevelLoader.ts`)
* Entities handle their own collision response via `onPlayerCollision()` returning a `CollisionResult` — never use `instanceof` checks in GameScene
* Player states are managed by a generic `StateMachine<Player, PlayerState>` — add new states as string union members in `PlayerState`
* Physics runs at fixed 60 FPS via `GameLoop` accumulator pattern; rendering is decoupled
* All tunable physics values go in `src/constants.ts` — no magic numbers in logic files

# Adding a New Entity

1. Create a file in `src/entities/` implementing `GameEntity`
2. Define `onPlayerCollision()` to return effects (score, damage, velocity changes)
3. Apply `applyChromaKey(sprite)` to any sprite with a magenta background
4. Register the entity type in the `switch` block in `src/level/LevelLoader.ts`
5. Add spawn entries to level data in `src/level/LevelData.ts`

# Sprites and Animation

* Spritesheets use the custom `SpriteSheet` class (`src/rendering/SpriteSheet.ts`) with `SheetDef` grid definitions
* Frame data is defined in `src/rendering/AssetLoader.ts` via `new SpriteSheet()` constructor calls
* Use `AnimationController` for frame-based animation with `ticksPerFrame` timing
* Generated sprites use magenta (#FF00FF) backgrounds — `WebGLRenderer.bakeChromaKey()` removes them at load time via an FBO render pass
