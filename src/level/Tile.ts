import { TILE_SIZE } from '../constants'

export interface TileType {
  id: number
  solid: boolean
  heights: number[] // 16 values: solid height per column from bottom
  angle: number // surface angle in radians (0 = flat)
  color: number // debug render color
}

function flatHeights(h: number): number[] {
  return Array(TILE_SIZE).fill(h)
}

function slopeHeights(fromLeft: number, toRight: number): number[] {
  const heights: number[] = []
  for (let i = 0; i < TILE_SIZE; i++) {
    heights.push(
      Math.round(fromLeft + ((toRight - fromLeft) * i) / (TILE_SIZE - 1)),
    )
  }
  return heights
}

// Tile type registry
export const TILES: Record<number, TileType> = {
  0: {
    id: 0,
    solid: false,
    heights: flatHeights(0),
    angle: 0,
    color: 0x000000,
  }, // air
  1: {
    id: 1,
    solid: true,
    heights: flatHeights(TILE_SIZE),
    angle: 0,
    color: 0x8b4513,
  }, // solid block (dirt)
  2: {
    id: 2,
    solid: true,
    heights: flatHeights(TILE_SIZE),
    angle: 0,
    color: 0x228b22,
  }, // grass top
  3: {
    id: 3,
    solid: true,
    heights: slopeHeights(0, TILE_SIZE),
    angle: -Math.PI / 4,
    color: 0x32cd32,
  }, // slope up-right 45deg
  4: {
    id: 4,
    solid: true,
    heights: slopeHeights(TILE_SIZE, 0),
    angle: Math.PI / 4,
    color: 0x32cd32,
  }, // slope up-left 45deg
  5: {
    id: 5,
    solid: true,
    heights: slopeHeights(0, TILE_SIZE / 2),
    angle: -Math.atan2(TILE_SIZE / 2, TILE_SIZE),
    color: 0x3cb371,
  }, // gentle slope right (low half)
  6: {
    id: 6,
    solid: true,
    heights: slopeHeights(TILE_SIZE / 2, TILE_SIZE),
    angle: -Math.atan2(TILE_SIZE / 2, TILE_SIZE),
    color: 0x3cb371,
  }, // gentle slope right (high half)
  7: {
    id: 7,
    solid: true,
    heights: slopeHeights(TILE_SIZE / 2, 0),
    angle: Math.atan2(TILE_SIZE / 2, TILE_SIZE),
    color: 0x3cb371,
  }, // gentle slope left (low half)
  8: {
    id: 8,
    solid: true,
    heights: slopeHeights(TILE_SIZE, TILE_SIZE / 2),
    angle: Math.atan2(TILE_SIZE / 2, TILE_SIZE),
    color: 0x3cb371,
  }, // gentle slope left (high half)
  9: {
    id: 9,
    solid: true,
    heights: flatHeights(TILE_SIZE / 2),
    angle: 0,
    color: 0x696969,
  }, // half-height platform
}

export function getTileType(id: number): TileType {
  return TILES[id] ?? TILES[0]
}

export function getTileHeight(tile: TileType, column: number): number {
  const col = Math.max(0, Math.min(TILE_SIZE - 1, Math.floor(column)))
  return tile.heights[col]
}
