import { Container, Graphics } from "pixi.js"

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  color: number
  gravity: number
  fadeOut: boolean
}

export class ParticleSystem {
  container: Container
  private particles: Particle[] = []
  private graphics: Graphics

  constructor() {
    this.container = new Container()
    this.graphics = new Graphics()
    this.container.addChild(this.graphics)
  }

  /** Dust puff when running on ground */
  emitDust(x: number, y: number, direction: number) {
    for (let i = 0; i < 3; i++) {
      this.particles.push({
        x,
        y,
        vx: -direction * (0.5 + Math.random() * 1.5),
        vy: -(Math.random() * 1.5),
        life: 15 + Math.floor(Math.random() * 10),
        maxLife: 25,
        size: 2 + Math.random() * 2,
        color: 0xccbb99,
        gravity: 0.05,
        fadeOut: true,
      })
    }
  }

  /** Sparkle burst when collecting a ring */
  emitRingSparkle(x: number, y: number) {
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * (1.5 + Math.random()),
        vy: Math.sin(angle) * (1.5 + Math.random()),
        life: 12 + Math.floor(Math.random() * 8),
        maxLife: 20,
        size: 1.5 + Math.random(),
        color: 0xffee44,
        gravity: 0,
        fadeOut: true,
      })
    }
  }

  /** Poof when destroying an enemy */
  emitEnemyPoof(x: number, y: number) {
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 1 + Math.random() * 2
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 15 + Math.floor(Math.random() * 10),
        maxLife: 25,
        size: 2 + Math.random() * 3,
        color: 0xff8800,
        gravity: 0.08,
        fadeOut: true,
      })
    }
  }

  /** Spin dash charge sparks */
  emitSpindashSpark(x: number, y: number) {
    for (let i = 0; i < 2; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 10,
        y,
        vx: (Math.random() - 0.5) * 3,
        vy: -(1 + Math.random() * 3),
        life: 8 + Math.floor(Math.random() * 6),
        maxLife: 14,
        size: 1 + Math.random(),
        color: 0x4488ff,
        gravity: 0,
        fadeOut: true,
      })
    }
  }

  update() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.x += p.vx
      p.y += p.vy
      p.vy += p.gravity
      p.life--
      if (p.life <= 0) {
        this.particles.splice(i, 1)
      }
    }
  }

  render() {
    this.graphics.clear()
    for (const p of this.particles) {
      const alpha = p.fadeOut ? p.life / p.maxLife : 1
      this.graphics.circle(p.x, p.y, p.size)
      this.graphics.fill({ color: p.color, alpha })
    }
  }
}
