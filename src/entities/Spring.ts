import type { GameEntity, CollisionResult } from "../level/LevelLoader"
import { getSpringFrame } from "../rendering/AssetLoader"
import type { WebGLRenderer } from "../rendering/WebGLRenderer"

export class Spring implements GameEntity {
  x: number
  y: number
  width = 16
  height = 16
  active = true
  force: number
  private compressed = false
  private compressTimer = 0
  private color: "yellow" | "red"

  constructor(x: number, y: number, force: number) {
    this.x = x
    this.y = y
    this.force = force
    this.color = force < -11 ? "red" : "yellow"
  }

  trigger() {
    this.compressed = true
    this.compressTimer = 10
  }

  update(_dt: number) {
    if (this.compressTimer > 0) {
      this.compressTimer--
      if (this.compressTimer === 0) {
        this.compressed = false
      }
    }
  }

  render(renderer: WebGLRenderer) {
    const frame = getSpringFrame(this.color, this.compressed)
    renderer.drawFrame(frame, this.x - 10, this.y - 10, 20, 20)
  }

  onPlayerCollision(
    _playerIsRolling: boolean,
    playerYSpeed: number,
  ): CollisionResult | null {
    if (playerYSpeed >= 0) {
      this.trigger()
      return { setYSpeed: this.force, detachFromGround: true }
    }
    return null
  }
}
