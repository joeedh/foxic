import { Enemy } from './Enemy'

export class EnemyBee extends Enemy {
  protected enemyType = 'bee' as const
  private baseY: number
  private amplitude = 30
  private frequency = 0.03

  constructor(x: number, y: number) {
    super(x, y)
    this.baseY = y
    this.width = 20
    this.height = 20
  }

  update(_dt: number) {
    if (!this.active) return

    this.timer++
    this.y = this.baseY + Math.sin(this.timer * this.frequency) * this.amplitude
  }
}
