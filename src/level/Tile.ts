import { TILE_SIZE } from '../constants'

export interface TileType {
  id: number
  solid: boolean
  heights: number[] // 16 values: solid height per column from bottom
  angle: number // surface angle in radians (0 = flat)
  color: number // debug render color
  solidMask?: boolean[][] // [row][col] for complex tiles (loops)
}

function flatHeights(h: number): number[] {
  return Array(TILE_SIZE).fill(h)
}

function slopeHeights(fromLeft: number, toRight: number): number[] {
  const heights: number[] = []
  for (let i = 0; i < TILE_SIZE; i++) {
    heights.push(Math.round(fromLeft + ((toRight - fromLeft) * i) / (TILE_SIZE - 1)))
  }
  return heights
}

/**
 * Check if a local pixel position within a tile is solid.
 * Works for both simple tiles (heights-based) and complex
 * tiles (solidMask-based).
 */
export function isTileSolid(tile: TileType, localX: number, localY: number): boolean {
  const col = Math.max(0, Math.min(TILE_SIZE - 1, Math.floor(localX)))
  const row = Math.max(0, Math.min(TILE_SIZE - 1, Math.floor(localY)))
  if (tile.solidMask) {
    return tile.solidMask[row][col]
  }
  return tile.heights[col] > TILE_SIZE - 1 - row
}

// Tile type registry
export const TILES: Record<number, TileType> = {
  0: {
    id     : 0,
    solid  : false,
    heights: flatHeights(0),
    angle  : 0,
    color  : 0x000000,
  }, // air
  1: {
    id     : 1,
    solid  : true,
    heights: flatHeights(TILE_SIZE),
    angle  : 0,
    color  : 0x8b4513,
  }, // solid block (dirt)
  2: {
    id     : 2,
    solid  : true,
    heights: flatHeights(TILE_SIZE),
    angle  : 0,
    color  : 0x228b22,
  }, // grass top
  3: {
    id     : 3,
    solid  : true,
    heights: slopeHeights(0, TILE_SIZE),
    angle  : -Math.PI / 4,
    color  : 0x32cd32,
  }, // slope up-right 45deg
  4: {
    id     : 4,
    solid  : true,
    heights: slopeHeights(TILE_SIZE, 0),
    angle  : Math.PI / 4,
    color  : 0x32cd32,
  }, // slope up-left 45deg
  5: {
    id     : 5,
    solid  : true,
    heights: slopeHeights(0, TILE_SIZE / 2),
    angle  : -Math.atan2(TILE_SIZE / 2, TILE_SIZE),
    color  : 0x3cb371,
  }, // gentle slope right (low half)
  6: {
    id     : 6,
    solid  : true,
    heights: slopeHeights(TILE_SIZE / 2, TILE_SIZE),
    angle  : -Math.atan2(TILE_SIZE / 2, TILE_SIZE),
    color  : 0x3cb371,
  }, // gentle slope right (high half)
  7: {
    id     : 7,
    solid  : true,
    heights: slopeHeights(TILE_SIZE / 2, 0),
    angle  : Math.atan2(TILE_SIZE / 2, TILE_SIZE),
    color  : 0x3cb371,
  }, // gentle slope left (low half)
  8: {
    id     : 8,
    solid  : true,
    heights: slopeHeights(TILE_SIZE, TILE_SIZE / 2),
    angle  : Math.atan2(TILE_SIZE / 2, TILE_SIZE),
    color  : 0x3cb371,
  }, // gentle slope left (high half)
  9: {
    id     : 9,
    solid  : true,
    heights: flatHeights(TILE_SIZE / 2),
    angle  : 0,
    color  : 0x696969,
  }, // half-height platform
}

function normalizeAngle(a: number): number {
  while (a > Math.PI) a -= 2 * Math.PI
  while (a <= -Math.PI) a += 2 * Math.PI
  return a
}

/**
 * Generate loop tiles from circle geometry.
 * Returns tile definitions and a layout array of
 * {col, row, tileId} offsets from the loop center tile.
 */
export function generateLoopTiles(
  innerRadius: number,
  outerRadius: number,
): {
  tiles: Record<number, TileType>
  layout: { col: number; row: number; tileId: number }[]
} {
  const tiles: Record<number, TileType> = {}
  const layout: {
    col: number
    row: number
    tileId: number
  }[] = []
  let nextId = 100

  const gridRadius = Math.ceil(outerRadius / TILE_SIZE) + 1

  for (let tileRow = -gridRadius; tileRow <= gridRadius; tileRow++) {
    for (let tileCol = -gridRadius; tileCol <= gridRadius; tileCol++) {
      const tileLeft = tileCol * TILE_SIZE
      const tileTop = tileRow * TILE_SIZE

      // Build solid mask
      const mask: boolean[][] = []
      let hasSolid = false
      let hasAir = false

      for (let py = 0; py < TILE_SIZE; py++) {
        mask[py] = []
        for (let px = 0; px < TILE_SIZE; px++) {
          const worldX = tileLeft + px + 0.5
          const worldY = tileTop + py + 0.5
          const dist = Math.sqrt(worldX * worldX + worldY * worldY)
          const solid = dist >= innerRadius && dist <= outerRadius
          mask[py][px] = solid
          if (solid) hasSolid = true
          else hasAir = true
        }
      }

      if (!hasSolid) continue
      if (!hasAir) continue

      // Compute heights (solid from bottom per column)
      const heights: number[] = []
      for (let col = 0; col < TILE_SIZE; col++) {
        let h = 0
        for (let row = TILE_SIZE - 1; row >= 0; row--) {
          if (mask[row][col]) h++
          else break
        }
        heights.push(h)
      }

      // Surface angle at tile midpoint on the circle
      const midX = tileLeft + TILE_SIZE / 2
      const midY = tileTop + TILE_SIZE / 2
      const radialAngle = Math.atan2(midY, midX)
      const surfaceAngle = radialAngle - Math.PI / 2
      const angle = normalizeAngle(surfaceAngle)

      const id = nextId++
      const tile: TileType = {
        id,
        solid: true,
        heights,
        angle,
        color    : 0x8866aa,
        solidMask: mask,
      }
      tiles[id] = tile
      TILES[id] = tile

      layout.push({
        col   : tileCol,
        row   : tileRow,
        tileId: id,
      })
    }
  }

  return { tiles, layout }
}

/**
 * Place a loop into a tile grid.
 * centerCol/centerRow is the grid position of the
 * loop center.
 */
export function placeLoop(
  grid: number[][],
  depthGrid: number[][],
  centerCol: number,
  centerRow: number,
  loopDepth: number = 1,
  innerRadius: number = 48,
  outerRadius: number = 64,
): void {
  const { layout } = generateLoopTiles(innerRadius, outerRadius)

  for (const entry of layout) {
    const col = centerCol + entry.col
    const row = centerRow + entry.row
    if (row >= 0 && row < grid.length && col >= 0 && col < grid[0].length) {
      grid[row][col] = entry.tileId
      depthGrid[row][col] = loopDepth
    }
  }
}

export function getTileType(id: number): TileType {
  return TILES[id] ?? TILES[0]
}

export function getTileHeight(tile: TileType, column: number): number {
  const col = Math.max(0, Math.min(TILE_SIZE - 1, Math.floor(column)))
  return tile.heights[col]
}
