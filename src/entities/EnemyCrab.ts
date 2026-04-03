import { Enemy } from "./Enemy"
import type { TileMap } from "../level/TileMap"

export class EnemyCrab extends Enemy {
  protected enemyType = "crab" as const
  private speed = 0.5
  private direction = 1
  private tileMap: TileMap

  constructor(x: number, y: number, tileMap: TileMap) {
    super(x, y)
    this.tileMap = tileMap
  }

  update(_dt: number) {
    if (!this.active) return

    this.timer++
    this.x += this.speed * this.direction

    const aheadX = this.x + this.direction * (this.width / 2 + 2)
    const belowY = this.y + this.height + 4
    const groundTile = this.tileMap.getTileAt(aheadX, belowY)
    const wallCheck = this.tileMap.getTileAt(aheadX, this.y + this.height / 2)

    if (!groundTile.solid || wallCheck.solid) {
      this.direction *= -1
    }

    // Flip sprite based on direction
    this.sprite.scale.x =
      this.direction > 0
        ? Math.abs(this.sprite.scale.x)
        : -Math.abs(this.sprite.scale.x)
  }
}
