import { Container, Rectangle, Sprite } from "pixi.js"
import { TILE_SIZE } from "../constants"
import { getTileType, getTileHeight, type TileType } from "./Tile"
import { getTileTexture } from "../rendering/SpriteManager"

export class TileMap {
  readonly width: number // in tiles
  readonly height: number // in tiles
  readonly pixelWidth: number
  readonly pixelHeight: number
  private grid: number[][]
  container: Container
  private tileset: string
  private sprites: Sprite[] = []

  constructor(grid: number[][], tileset: string = "greenhill") {
    this.grid = grid
    this.height = grid.length
    this.width = grid[0].length
    this.pixelWidth = this.width * TILE_SIZE
    this.pixelHeight = this.height * TILE_SIZE
    this.tileset = tileset
    this.container = new Container()
    this.buildSprites()
  }

  public rebuildSprites() {
    this.buildSprites()
  }
  
  private buildSprites() {
    this.sprites.forEach(sprite => sprite.removeFromParent())
    this.sprites.length = 0

    for (let row = 0; row < this.height; row++) {
      for (let col = 0; col < this.width; col++) {
        const id = this.grid[row][col]
        if (id === 0) continue // skip air

        const texture = getTileTexture(id, this.tileset)
        if (!texture) continue

        const sprite = new Sprite(texture)
        sprite.x = col * TILE_SIZE
        sprite.y = row * TILE_SIZE
        sprite.width = TILE_SIZE
        sprite.height = TILE_SIZE
        this.container.addChild(sprite)
        this.sprites.push(sprite)
      }
    }
  }

  getTileAt(pixelX: number, pixelY: number): TileType {
    const col = Math.floor(pixelX / TILE_SIZE)
    const row = Math.floor(pixelY / TILE_SIZE)
    if (col < 0 || col >= this.width || row < 0 || row >= this.height) {
      return getTileType(0) // air outside bounds
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
   * Get the solid surface Y coordinate at a given pixel X position,
   * scanning downward from startY. Returns the Y of the surface, or null if no ground found.
   */
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

  /**
   * Check for wall collision at a pixel position.
   * Returns the X position of the wall edge, or null if no wall.
   */
  getWall(pixelX: number, pixelY: number, direction: -1 | 1): number | null {
    const col = Math.floor(pixelX / TILE_SIZE)
    const row = Math.floor(pixelY / TILE_SIZE)
    if (col < 0 || col >= this.width || row < 0 || row >= this.height) {
      return null
    }

    const tileId = this.grid[row][col]
    const tile = getTileType(tileId)
    if (!tile.solid) return null

    // Check if the point is inside the solid part of the tile
    const localX = pixelX - col * TILE_SIZE
    const localY = pixelY - row * TILE_SIZE
    const h = getTileHeight(tile, localX)
    const solidTop = TILE_SIZE - h

    if (localY >= solidTop) {
      // Inside solid part
      if (direction > 0) {
        return col * TILE_SIZE // left edge of wall
      } else {
        return (col + 1) * TILE_SIZE // right edge of wall
      }
    }
    return null
  }

  /**
   * Check ceiling at a pixel position.
   * Returns the Y of the ceiling bottom, or null.
   */
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
      return row * TILE_SIZE + TILE_SIZE // push out below
    }
    return null
  }
}
