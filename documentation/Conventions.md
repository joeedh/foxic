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

* Spritesheets use PixiJS `Spritesheet` class with named frames and animation groups
* Frame names are defined in `src/rendering/SpriteManager.ts` via `buildSheetData()`
* Use `AnimationController` for frame-based animation with `ticksPerFrame` timing
* Generated sprites use magenta (#FF00FF) backgrounds — `ChromaKeyFilter` removes them
