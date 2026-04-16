import type { GameEntity, CollisionResult } from '../level/LevelLoader'
import type { WebGLRenderer } from '../rendering/WebGLRenderer'
import type { Player } from './Player'

/**
 * Invisible trigger zone that switches the player's depth
 * layer when crossed.  Only fires once per entry (not every
 * frame the player overlaps).
 */
export class DepthTrigger implements GameEntity {
  x: number
  y: number
  width = 16
  height = 96
  active = true
  private fromDepth: number
  private toDepth: number
  private player: Player | undefined
  private wasInside = false

  constructor(x: number, y: number, fromDepth: number, toDepth: number) {
    this.x = x
    this.y = y
    this.fromDepth = fromDepth
    this.toDepth = toDepth
  }

  setPlayer(player: Player) {
    this.player = player
  }

  update(_dt: number) {
    if (!this.player) return

    const px = this.player.physics.x
    const py = this.player.physics.y
    const left = this.x - this.width / 2
    const right = this.x + this.width / 2
    const top = this.y - this.height / 2
    const bottom = this.y + this.height / 2

    const inside = px >= left && px <= right && py >= top && py <= bottom

    if (inside && !this.wasInside) {
      const depth = this.player.physics.currentDepth
      if (depth === this.fromDepth) {
        this.player.physics.currentDepth = this.toDepth
      } else if (depth === this.toDepth) {
        this.player.physics.currentDepth = this.fromDepth
      }
    }

    this.wasInside = inside
  }

  render(_renderer: WebGLRenderer) {
    // Invisible
  }

  onPlayerCollision(): CollisionResult | null {
    return null
  }
}
