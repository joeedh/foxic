import { Sprite, Graphics, Container } from "pixi.js"
import type { GameEntity, CollisionResult } from "../level/LevelLoader"
import { getRingFrame, applyChromaKey } from "../rendering/SpriteManager"

export class Ring implements GameEntity {
  x: number
  y: number
  width = 16
  height = 16
  active = true
  private sprite: Sprite
  private baseY: number
  private timer = 0

  constructor(x: number, y: number) {
    this.x = x
    this.y = y
    this.baseY = y
    this.sprite = new Sprite(getRingFrame(0))
    this.sprite.anchor.set(0.5, 0.5)
    this.sprite.width = 16
    this.sprite.height = 16
    applyChromaKey(this.sprite)
  }

  update(_dt: number) {
    if (!this.active) return
    this.timer++
    this.y = this.baseY + Math.sin(this.timer * 0.05) * 3

    // Animate ring rotation
    const frame = Math.floor(this.timer / 8) % 4
    this.sprite.texture = getRingFrame(frame)
  }

  render() {
    if (!this.active) {
      this.sprite.visible = false
      return
    }
    this.sprite.visible = true
    this.sprite.x = this.x
    this.sprite.y = this.y
  }

  onPlayerCollision(): CollisionResult | null {
    this.active = false
    return { collectRings: 1, scorePoints: 10 }
  }

  addToContainer(container: Container) {
    container.addChild(this.sprite)
  }
}

export class ScatteredRing implements GameEntity {
  x: number
  y: number
  width = 12
  height = 12
  active = true
  private graphics: Graphics
  private xSpeed: number
  private ySpeed: number
  private life = 256
  private bounceCount = 0

  constructor(x: number, y: number, angle: number) {
    this.x = x
    this.y = y
    this.xSpeed = Math.cos(angle) * 4
    this.ySpeed = Math.sin(angle) * -4
    this.graphics = new Graphics()
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
      this.bounceCount++
    }
  }

  render() {
    this.graphics.clear()
    if (!this.active || (this.life < 60 && this.life % 4 < 2)) {
      this.graphics.visible = false
      return
    }
    this.graphics.visible = true
    this.graphics.circle(0, 0, 5)
    this.graphics.fill(0xffcc00)

    this.graphics.x = this.x
    this.graphics.y = this.y
  }

  onPlayerCollision(): CollisionResult | null {
    return null
  }

  addToContainer(container: Container) {
    container.addChild(this.graphics)
  }
}
