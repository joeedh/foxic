import type { GameEntity, CollisionResult } from '../level/LevelLoader'
import { getRingFrame, getCircleTexture } from '../rendering/AssetLoader'
import type { WebGLRenderer } from '../rendering/WebGLRenderer'

export class Ring implements GameEntity {
  x: number
  y: number
  width = 16
  height = 16
  active = true
  private baseY: number
  private timer = 0

  constructor(x: number, y: number) {
    this.x = x
    this.y = y
    this.baseY = y
  }

  update(_dt: number) {
    if (!this.active) return
    this.timer++
    this.y = this.baseY + Math.sin(this.timer * 0.05) * 3
  }

  render(renderer: WebGLRenderer) {
    if (!this.active) return
    const frameIdx = Math.floor(this.timer / 8) % 4
    const frame = getRingFrame(frameIdx)
    renderer.drawFrame(frame, this.x - 8, this.y - 8, 16, 16)
  }

  onPlayerCollision(): CollisionResult | null {
    this.active = false
    return { collectRings: 1, scorePoints: 10 }
  }
}

export class ScatteredRing implements GameEntity {
  x: number
  y: number
  width = 12
  height = 12
  active = true
  private xSpeed: number
  private ySpeed: number
  private life = 256

  constructor(x: number, y: number, angle: number) {
    this.x = x
    this.y = y
    this.xSpeed = Math.cos(angle) * 4
    this.ySpeed = Math.sin(angle) * -4
  }

  update(_dt: number) {
    if (!this.active) return

    this.life--
    if (this.life <= 0) {
      this.active = false
      return
    }

    this.ySpeed += 0.21875
    this.x += this.xSpeed
    this.y += this.ySpeed
  }

  bounce(groundY: number) {
    if (this.y > groundY) {
      this.y = groundY
      this.ySpeed *= -0.75
      this.xSpeed *= 0.75
    }
  }

  render(renderer: WebGLRenderer) {
    if (!this.active || (this.life < 60 && this.life % 4 < 2)) return
    const circle = getCircleTexture()
    renderer.drawSprite(
      circle,
      this.x - 5,
      this.y - 5,
      10,
      10,
      0,
      0,
      1,
      1,
      1,
      false,
      false,
      0,
      1.0,
      0.8,
      0.0,
    )
  }

  onPlayerCollision(): CollisionResult | null {
    return null
  }
}
