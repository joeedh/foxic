import { TILE_SIZE } from '../constants'
import { getTileType, getTileHeight, type TileType } from './Tile'
import { getTileFrame, getTileVariantCount } from '../rendering/AssetLoader'
import type { WebGLRenderer } from '../rendering/WebGLRenderer'

export class TileMap {
  readonly width: number // in tiles
  readonly height: number // in tiles
  readonly pixelWidth: number
  readonly pixelHeight: number
  private grid: number[][]
  private tileset: string

  // Deterministic hash from grid position for variant selection
  private static tileHash(row: number, col: number): number {
    let h = (row * 374761393 + col * 668265263) | 0
    h = Math.imul(h ^ (h >>> 13), 1274126177)
    return (h ^ (h >>> 16)) >>> 0
  }

  constructor(grid: number[][], tileset: string = 'greenhill') {
    this.grid = grid
    this.height = grid.length
    this.width = grid[0].length
    this.pixelWidth = this.width * TILE_SIZE
    this.pixelHeight = this.height * TILE_SIZE
    this.tileset = tileset
  }

  render(
    renderer: WebGLRenderer,
    camX: number,
    camY: number,
    viewW: number,
    viewH: number,
  ) {
    const startCol = Math.max(0, Math.floor(camX / TILE_SIZE))
    const endCol = Math.min(this.width, Math.ceil((camX + viewW) / TILE_SIZE))
    const startRow = Math.max(0, Math.floor(camY / TILE_SIZE))
    const endRow = Math.min(this.height, Math.ceil((camY + viewH) / TILE_SIZE))

    for (let row = startRow; row < endRow; row++) {
      for (let col = startCol; col < endCol; col++) {
        const id = this.grid[row][col]
        if (id === 0) continue

        const variantCount = getTileVariantCount(id)
        const frame =
          variantCount > 0
            ? getTileFrame(
                id,
                this.tileset,
                TileMap.tileHash(row, col) % variantCount,
              )
            : getTileFrame(id, this.tileset)
        if (!frame) continue

        renderer.drawFrame(
          frame,
          col * TILE_SIZE,
          row * TILE_SIZE,
          TILE_SIZE,
          TILE_SIZE,
        )
      }
    }
  }

  getTileAt(pixelX: number, pixelY: number): TileType {
    const col = Math.floor(pixelX / TILE_SIZE)
    const row = Math.floor(pixelY / TILE_SIZE)
    if (col < 0 || col >= this.width || row < 0 || row >= this.height) {
      return getTileType(0)
    }
    return getTileType(this.grid[row][col])
  }

  getTileId(col: number, row: number): number {
    if (col < 0 || col >= this.width || row < 0 || row >= this.height) {
      return 0
    }
    return this.grid[row][col]
  }

  getGroundHeight(
    pixelX: number,
    startY: number,
    maxDist: number,
  ): { y: number; angle: number } | null {
    for (let dy = -TILE_SIZE; dy < maxDist; dy++) {
      const checkY = startY + dy
      const col = Math.floor(pixelX / TILE_SIZE)
      const row = Math.floor(checkY / TILE_SIZE)
      if (col < 0 || col >= this.width || row < 0 || row >= this.height)
        continue

      const tileId = this.grid[row][col]
      const tile = getTileType(tileId)
      if (!tile.solid) continue

      const localX = pixelX - col * TILE_SIZE
      const h = getTileHeight(tile, localX)
      const surfaceY = (row + 1) * TILE_SIZE - h

      if (checkY >= surfaceY) {
        return { y: surfaceY, angle: tile.angle }
      }
    }
    return null
  }

  getWall(pixelX: number, pixelY: number, direction: -1 | 1): number | null {
    const col = Math.floor(pixelX / TILE_SIZE)
    const row = Math.floor(pixelY / TILE_SIZE)
    if (col < 0 || col >= this.width || row < 0 || row >= this.height) {
      return null
    }

    const tileId = this.grid[row][col]
    const tile = getTileType(tileId)
    if (!tile.solid) return null

    const localX = pixelX - col * TILE_SIZE
    const localY = pixelY - row * TILE_SIZE
    const h = getTileHeight(tile, localX)
    const solidTop = TILE_SIZE - h

    if (localY >= solidTop) {
      if (direction > 0) {
        return col * TILE_SIZE
      } else {
        return (col + 1) * TILE_SIZE
      }
    }
    return null
  }

  getCeiling(pixelX: number, pixelY: number): number | null {
    const col = Math.floor(pixelX / TILE_SIZE)
    const row = Math.floor(pixelY / TILE_SIZE)
    if (col < 0 || col >= this.width || row < 0 || row >= this.height) {
      return null
    }

    const tileId = this.grid[row][col]
    const tile = getTileType(tileId)
    if (!tile.solid) return null

    const localX = pixelX - col * TILE_SIZE
    const localY = pixelY - row * TILE_SIZE
    const h = getTileHeight(tile, localX)
    const solidTop = TILE_SIZE - h

    if (localY >= solidTop) {
      return row * TILE_SIZE + TILE_SIZE
    }
    return null
  }
}
