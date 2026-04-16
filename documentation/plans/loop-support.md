# Loop Support — Depth Layer System

## Context

Loops need the player to run around a full circular ring, but the ring's
bottom overlaps with the normal ground.  A depth/layer system solves this
cleanly: normal ground lives on depth 0, the full closed ring lives on
depth 1, and trigger zones at the loop entry/exit switch the player
between depths.  Only tiles matching the player's current depth participate
in collision.

## Design

### Depth rules
- Every grid cell has a **depth** (`0` by default).
- The player carries a `currentDepth` (starts `0`).
- **Collision queries only check tiles whose depth matches
  `currentDepth`.**
- Rendering draws **all** depths (so the ring is always visible).

### Loop placement
- Depth 0: normal ground continues through the loop area (player
  walks over it normally).
- Depth 1: the **full closed ring** (including the bottom arc we
  previously removed).
- Two **DepthTrigger** entities sit at the left and right sides of
  the loop.  When the player crosses one while moving inward, depth
  switches to 1.  When moving outward (or completing the loop),
  depth switches back to 0.

### Trigger logic
Each trigger stores a target depth and a required entry direction.
- Right-side trigger (entering from left): if player is moving right
  and currently depth 0 → switch to depth 1.
- Left-side trigger (entering from right): if player is moving left
  and currently depth 0 → switch to depth 1.
- Either trigger, depth 1, moving outward → switch to depth 0.

The trigger fires when the player's center X crosses the trigger X.
Because both depths have matching ground surfaces at the trigger
positions, the switch is seamless.

## File Changes

### 1. `src/level/LevelData.ts` — add `depthGrid` to `LevelDefinition`

```ts
interface LevelDefinition {
  // ... existing fields ...
  depthGrid?: number[][]  // parallel to tileGrid, default 0
}
```

In `createLevel1()`, build a `depthGrid` of all zeros, then set
loop-ring cells to depth 1 via a new `placeLoopDepth()` helper or
by having `placeLoop()` write to both grids.

Revert the bottom-arc exclusion — the full ring goes on depth 1.
Keep normal ground on depth 0 through the loop area.

Add two `depthTrigger` entity spawns at the loop sides.

### 2. `src/level/Tile.ts` — revert bottom-arc filter

Remove the `radialCheck` skip so `generateLoopTiles` produces a
full ring again.

### 3. `src/level/TileMap.ts` — depth-aware queries

Constructor accepts optional `depthGrid`.  Store it as a field.

Add helper: `getDepth(col, row): number`.

Update every tile-lookup in collision methods (`isPixelSolid`,
`getGroundHeight`, `getCeilingHeight`, `getRightWallSurface`,
`getLeftWallSurface`, `getWall`, `getCeiling`) to accept a `depth`
parameter and skip tiles whose depth doesn't match.

Rendering stays unchanged (draws all depths).

### 4. `src/physics/SensorSystem.ts` — pass depth through

All sensor methods accept an optional `depth` parameter and forward
it to TileMap queries.

### 5. `src/physics/SonicPhysics.ts` — use player depth

`PhysicsState` gains `currentDepth: number`.

`updateGround` and `updateAir` pass `state.currentDepth` to every
sensor call.

### 6. `src/entities/Player.ts` — init `currentDepth`

Set `currentDepth: 0` in the initial `PhysicsState`.

### 7. `src/entities/DepthTrigger.ts` — new entity

Implements `GameEntity`.  Invisible zone (width ~16, height ~64)
that checks player overlap each frame.  On overlap:

```
if player moving right && player.currentDepth === fromDepth:
    player.currentDepth = toDepth
if player moving left && player.currentDepth === toDepth:
    player.currentDepth = fromDepth
```

Fields: `x`, `y`, `fromDepth`, `toDepth`.

### 8. `src/level/LevelLoader.ts` — register DepthTrigger

Add `'depthTrigger'` case in the entity switch.  Pass `depthGrid`
to TileMap constructor.

### 9. `src/scenes/GameScene.ts` — scattered rings depth

`getGroundHeight` call for scattered rings should use depth 0
(they always interact with the main layer).

## Implementation Order

1. `Tile.ts` — revert bottom-arc filter
2. `LevelData.ts` — add `depthGrid` to interface, build it in
   `createLevel1`, place full ring on depth 1, add triggers
3. `TileMap.ts` — accept + store `depthGrid`, add depth param to
   all collision methods
4. `SensorSystem.ts` — pipe depth through to TileMap
5. `SonicPhysics.ts` — add `currentDepth` to PhysicsState, pass it
6. `Player.ts` — init `currentDepth: 0`
7. `DepthTrigger.ts` — new entity
8. `LevelLoader.ts` — wire up depthTrigger + depthGrid
9. `GameScene.ts` — pass depth 0 for scattered-ring ground check

## Verification

1. `pnpm typecheck` — no errors
2. Run to loop area on depth 0 — player walks over normal ground,
   ring is visible but non-solid
3. Cross right-side trigger → depth switches to 1 → player now
   collides with ring
4. Spindash into loop → runs up, across ceiling, back down
5. Cross left-side trigger → back to depth 0
6. Existing terrain unaffected (all on depth 0)
