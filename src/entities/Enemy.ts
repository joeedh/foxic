import type { GameEntity, CollisionResult } from '../level/LevelLoader'
import { getEnemyFrame } from '../rendering/AssetLoader'
import type { WebGLRenderer } from '../rendering/WebGLRenderer'

export abstract class Enemy implements GameEntity {
  x: number
  y: number
  width = 24
  height = 24
  active = true
  protected timer = 0
  protected flipX = false
  protected abstract enemyType: 'crab' | 'bee'

  constructor(x: number, y: number) {
    this.x = x
    this.y = y
  }

  abstract update(dt: number): void

  render(renderer: WebGLRenderer) {
    if (!this.active) return
    const frameIdx = Math.floor(this.timer / 10) % 3
    const frame = getEnemyFrame(this.enemyType, frameIdx)
    renderer.drawFrame(frame, this.x - 16, this.y - 16, 32, 32, {
      flipX: this.flipX,
    })
  }

  onPlayerCollision(
    playerIsRolling: boolean,
    playerYSpeed: number,
    playerBottomY: number,
  ): CollisionResult | null {
    if (playerIsRolling && playerYSpeed > 0 && playerBottomY < this.y) {
      this.active = false
      return { scorePoints: 100, setYSpeed: -4 }
    }
    return { hurtPlayer: true, scatterRings: true }
  }

  destroy() {
    this.active = false
  }
}
