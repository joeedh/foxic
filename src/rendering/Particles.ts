import type { WebGLRenderer } from "./WebGLRenderer"

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  r: number
  g: number
  b: number
  gravity: number
  fadeOut: boolean
}

function hexToRgb(hex: number): [number, number, number] {
  return [
    ((hex >> 16) & 0xff) / 255,
    ((hex >> 8) & 0xff) / 255,
    (hex & 0xff) / 255,
  ]
}

export class ParticleSystem {
  private particles: Particle[] = []

  private emit(
    x: number,
    y: number,
    vx: number,
    vy: number,
    life: number,
    maxLife: number,
    size: number,
    color: number,
    gravity: number,
  ) {
    const [r, g, b] = hexToRgb(color)
    this.particles.push({
      x,
      y,
      vx,
      vy,
      life,
      maxLife,
      size,
      r,
      g,
      b,
      gravity,
      fadeOut: true,
    })
  }

  emitDust(x: number, y: number, direction: number) {
    for (let i = 0; i < 3; i++) {
      this.emit(
        x,
        y,
        -direction * (0.5 + Math.random() * 1.5),
        -(Math.random() * 1.5),
        15 + Math.floor(Math.random() * 10),
        25,
        2 + Math.random() * 2,
        0xccbb99,
        0.05,
      )
    }
  }

  emitRingSparkle(x: number, y: number) {
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2
      this.emit(
        x,
        y,
        Math.cos(angle) * (1.5 + Math.random()),
        Math.sin(angle) * (1.5 + Math.random()),
        12 + Math.floor(Math.random() * 8),
        20,
        1.5 + Math.random(),
        0xffee44,
        0,
      )
    }
  }

  emitEnemyPoof(x: number, y: number) {
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 1 + Math.random() * 2
      this.emit(
        x,
        y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        15 + Math.floor(Math.random() * 10),
        25,
        2 + Math.random() * 3,
        0xff8800,
        0.08,
      )
    }
  }

  emitSpindashSpark(x: number, y: number) {
    for (let i = 0; i < 2; i++) {
      this.emit(
        x + (Math.random() - 0.5) * 10,
        y,
        (Math.random() - 0.5) * 3,
        -(1 + Math.random() * 3),
        8 + Math.floor(Math.random() * 6),
        14,
        1 + Math.random(),
        0x4488ff,
        0,
      )
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

  render(renderer: WebGLRenderer) {
    for (const p of this.particles) {
      const alpha = p.fadeOut ? p.life / p.maxLife : 1
      const s = p.size * 2
      renderer.drawRect(p.x - p.size, p.y - p.size, s, s, p.r, p.g, p.b, alpha)
    }
  }
}
