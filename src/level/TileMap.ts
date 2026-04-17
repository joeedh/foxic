import { TILE_SIZE } from '../constants'
import { getTileType, isTileSolid, type TileType } from './Tile'
import { getTileFrame, getTileVariantCount } from '../rendering/AssetLoader'
import type { WebGLRenderer } from '../rendering/WebGLRenderer'

export class TileMap {
  readonly width: number
  readonly height: number
  readonly pixelWidth: number
  readonly pixelHeight: number
  private grid: number[][]
  private depthGrid: number[][]
  private tileset: string

  private static tileHash(row: number, col: number): number {
    let h = (row * 374761393 + col * 668265263) | 0
    h = Math.imul(h ^ (h >>> 13), 1274126177)
    return (h ^ (h >>> 16)) >>> 0
  }

  constructor(grid: number[][], tileset: string = 'greenhill', depthGrid?: number[][]) {
    this.grid = grid
    this.height = grid.length
    this.width = grid[0].length
    this.pixelWidth = this.width * TILE_SIZE
    this.pixelHeight = this.height * TILE_SIZE
    this.depthGrid = depthGrid ?? grid.map((row) => new Array(row.length).fill(0))
    this.tileset = tileset
  }

  private getDepth(col: number, row: number): number {
    if (col < 0 || col >= this.width || row < 0 || row >= this.height) return 0
    return this.depthGrid[row][col]
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
            ? getTileFrame(id, this.tileset, TileMap.tileHash(row, col) % variantCount)
            : getTileFrame(id, this.tileset)

        if (frame) {
          renderer.drawFrame(
            frame,
            col * TILE_SIZE,
            row * TILE_SIZE,
            TILE_SIZE,
            TILE_SIZE,
          )
        } else {
          const tile = getTileType(id)
          const cr = ((tile.color >> 16) & 0xff) / 255
          const cg = ((tile.color >> 8) & 0xff) / 255
          const cb = (tile.color & 0xff) / 255
          if (tile.solidMask) {
            for (let py = 0; py < TILE_SIZE; py++) {
              let spanStart = -1
              for (let px = 0; px <= TILE_SIZE; px++) {
                const solid = px < TILE_SIZE && tile.solidMask[py][px]
                if (solid && spanStart < 0) {
                  spanStart = px
                } else if (!solid && spanStart >= 0) {
                  renderer.drawRect(
                    col * TILE_SIZE + spanStart,
                    row * TILE_SIZE + py,
                    px - spanStart,
                    1,
                    cr,
                    cg,
                    cb,
                    1,
                  )
                  spanStart = -1
                }
              }
            }
          } else {
            renderer.drawRect(
              col * TILE_SIZE,
              row * TILE_SIZE,
              TILE_SIZE,
              TILE_SIZE,
              cr,
              cg,
              cb,
              1,
            )
          }
        }
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

  /**
   * Check if a pixel position is solid at the given depth.
   */
  isPixelSolid(pixelX: number, pixelY: number, depth: number = 0): boolean {
    const col = Math.floor(pixelX / TILE_SIZE)
    const row = Math.floor(pixelY / TILE_SIZE)
    if (col < 0 || col >= this.width || row < 0 || row >= this.height) return false
    if (this.getDepth(col, row) !== depth) return false
    const tile = getTileType(this.grid[row][col])
    if (!tile.solid) return false
    const localX = pixelX - col * TILE_SIZE
    const localY = pixelY - row * TILE_SIZE
    return isTileSolid(tile, localX, localY)
  }

  getGroundHeight(
    pixelX: number,
    startY: number,
    maxDist: number,
    depth: number = 0,
  ): { y: number; angle: number } | undefined {
    for (let dy = -TILE_SIZE; dy < maxDist; dy++) {
      const checkY = startY + dy
      if (this.isPixelSolid(pixelX, checkY, depth)) {
        let surfaceY = checkY
        while (
          surfaceY > checkY - TILE_SIZE &&
          this.isPixelSolid(pixelX, surfaceY - 1, depth)
        ) {
          surfaceY--
        }
        const col = Math.floor(pixelX / TILE_SIZE)
        const row = Math.floor(surfaceY / TILE_SIZE)
        const tile = getTileType(this.getTileId(col, row))
        return { y: surfaceY, angle: tile.angle }
      }
    }
    return undefined
  }

  getCeilingHeight(
    pixelX: number,
    startY: number,
    maxDist: number,
    depth: number = 0,
  ): { y: number; angle: number } | undefined {
    for (let dy = TILE_SIZE; dy > -maxDist; dy--) {
      const checkY = startY + dy
      if (this.isPixelSolid(pixelX, checkY, depth)) {
        let surfaceY = checkY
        while (
          surfaceY < checkY + TILE_SIZE &&
          this.isPixelSolid(pixelX, surfaceY + 1, depth)
        ) {
          surfaceY++
        }
        surfaceY++
        const col = Math.floor(pixelX / TILE_SIZE)
        const row = Math.floor(checkY / TILE_SIZE)
        const tile = getTileType(this.getTileId(col, row))
        return { y: surfaceY, angle: tile.angle }
      }
    }
    return undefined
  }

  getRightWallSurface(
    pixelY: number,
    startX: number,
    maxDist: number,
    depth: number = 0,
  ): { x: number; angle: number } | undefined {
    for (let dx = -TILE_SIZE; dx < maxDist; dx++) {
      const checkX = startX + dx
      if (this.isPixelSolid(checkX, pixelY, depth)) {
        let surfaceX = checkX
        while (
          surfaceX > checkX - TILE_SIZE &&
          this.isPixelSolid(surfaceX - 1, pixelY, depth)
        ) {
          surfaceX--
        }
        const col = Math.floor(surfaceX / TILE_SIZE)
        const row = Math.floor(pixelY / TILE_SIZE)
        const tile = getTileType(this.getTileId(col, row))
        return { x: surfaceX, angle: tile.angle }
      }
    }
    return undefined
  }

  getLeftWallSurface(
    pixelY: number,
    startX: number,
    maxDist: number,
    depth: number = 0,
  ): { x: number; angle: number } | undefined {
    for (let dx = TILE_SIZE; dx > -maxDist; dx--) {
      const checkX = startX + dx
      if (this.isPixelSolid(checkX, pixelY, depth)) {
        let surfaceX = checkX
        while (
          surfaceX < checkX + TILE_SIZE &&
          this.isPixelSolid(surfaceX + 1, pixelY, depth)
        ) {
          surfaceX++
        }
        surfaceX++
        const col = Math.floor(checkX / TILE_SIZE)
        const row = Math.floor(pixelY / TILE_SIZE)
        const tile = getTileType(this.getTileId(col, row))
        return { x: surfaceX, angle: tile.angle }
      }
    }
    return undefined
  }

  getWall(
    pixelX: number,
    pixelY: number,
    direction: -1 | 1,
    depth: number = 0,
  ): number | undefined {
    const col = Math.floor(pixelX / TILE_SIZE)
    const row = Math.floor(pixelY / TILE_SIZE)
    if (col < 0 || col >= this.width || row < 0 || row >= this.height) {
      return undefined
    }
    if (this.getDepth(col, row) !== depth) return undefined

    const tileId = this.grid[row][col]
    const tile = getTileType(tileId)
    if (!tile.solid) return undefined

    const localX = pixelX - col * TILE_SIZE
    const localY = pixelY - row * TILE_SIZE

    if (isTileSolid(tile, localX, localY)) {
      if (direction > 0) {
        return col * TILE_SIZE
      } else {
        return (col + 1) * TILE_SIZE
      }
    }
    return undefined
  }

  getCeiling(pixelX: number, pixelY: number, depth: number = 0): number | undefined {
    const col = Math.floor(pixelX / TILE_SIZE)
    const row = Math.floor(pixelY / TILE_SIZE)
    if (col < 0 || col >= this.width || row < 0 || row >= this.height) {
      return undefined
    }
    if (this.getDepth(col, row) !== depth) return undefined

    const tileId = this.grid[row][col]
    const tile = getTileType(tileId)
    if (!tile.solid) return undefined

    const localX = pixelX - col * TILE_SIZE
    const localY = pixelY - row * TILE_SIZE

    if (isTileSolid(tile, localX, localY)) {
      return row * TILE_SIZE + TILE_SIZE
    }
    return undefined
  }
}
